import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Network, Loader2 } from 'lucide-react';
import type { KnowledgeGraph, KnowledgeNode } from './loreKnowledgeTypes';
import { NODE_TYPE_COLORS, NODE_TYPE_ORDER } from './loreKnowledgeTypes';

// ─── GLSL helpers ────────────────────────────────────────────
const noiseFunctions = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const nodeVertexShader = `${noiseFunctions}
attribute float nodeSize;
attribute float nodeType;
attribute vec3 nodeColor;
attribute float distanceFromRoot;
uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];
uniform float uPulseSpeed;
uniform float uBaseNodeSize;
varying vec3 vColor;
varying float vNodeType;
varying vec3 vPosition;
varying float vPulseIntensity;
varying float vDistanceFromRoot;
varying float vGlow;
float getPulseIntensity(vec3 wp,vec3 pp,float pt){
  if(pt<0.0)return 0.0;float t=uTime-pt;if(t<0.0||t>4.0)return 0.0;
  float pr=t*uPulseSpeed;float d=distance(wp,pp);
  return smoothstep(3.0,0.0,abs(d-pr))*smoothstep(4.0,0.0,t);
}
void main(){
  vNodeType=nodeType;vColor=nodeColor;vDistanceFromRoot=distanceFromRoot;
  vec3 wp=(modelMatrix*vec4(position,1.0)).xyz;vPosition=wp;
  float tpi=0.0;
  for(int i=0;i<3;i++)tpi+=getPulseIntensity(wp,uPulsePositions[i],uPulseTimes[i]);
  vPulseIntensity=min(tpi,1.0);
  float breathe=sin(uTime*0.7+distanceFromRoot*0.15)*0.15+0.85;
  float bs=nodeSize*breathe;float ps=bs*(1.0+vPulseIntensity*2.5);
  vGlow=0.5+0.5*sin(uTime*0.5+distanceFromRoot*0.2);
  vec3 mp=position;
  if(nodeType>0.5){float n=snoise(position*0.08+uTime*0.08);mp+=vec3(n)*0.15;}
  vec4 mvp=modelViewMatrix*vec4(mp,1.0);
  gl_PointSize=ps*uBaseNodeSize*(1000.0/-mvp.z);
  gl_Position=projectionMatrix*mvp;
}`;

const nodeFragmentShader = `
uniform float uTime;
uniform vec3 uPulseColors[3];
varying vec3 vColor;
varying float vNodeType;
varying vec3 vPosition;
varying float vPulseIntensity;
varying float vDistanceFromRoot;
varying float vGlow;
void main(){
  vec2 c=2.0*gl_PointCoord-1.0;float d=length(c);if(d>1.0)discard;
  float g1=1.0-smoothstep(0.0,0.5,d);float g2=1.0-smoothstep(0.0,1.0,d);
  float gs=pow(g1,1.2)+g2*0.3;
  float bc=0.9+0.1*sin(uTime*0.6+vDistanceFromRoot*0.25);
  vec3 base=vColor*bc;vec3 fc=base;
  if(vPulseIntensity>0.0){
    vec3 pc=mix(vec3(1.0),uPulseColors[0],0.4);
    fc=mix(base,pc,vPulseIntensity*0.8);fc*=(1.0+vPulseIntensity*1.2);gs*=(1.0+vPulseIntensity);
  }
  fc+=vec3(1.0)*smoothstep(0.4,0.0,d)*0.3;
  float a=gs*(0.95-0.3*d);
  float cf=smoothstep(100.0,15.0,length(vPosition-cameraPosition));
  if(vNodeType>0.5){fc*=1.1;a*=0.9;}
  fc*=(1.0+vGlow*0.1);
  gl_FragColor=vec4(fc,a*cf);
}`;

const connectionVertexShader = `${noiseFunctions}
attribute vec3 startPoint;
attribute vec3 endPoint;
attribute float connectionStrength;
attribute float pathIndex;
attribute vec3 connectionColor;
uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];
uniform float uPulseSpeed;
varying vec3 vColor;
varying float vConnectionStrength;
varying float vPulseIntensity;
varying float vPathPosition;
varying float vDistanceFromCamera;
float getPulseIntensity(vec3 wp,vec3 pp,float pt){
  if(pt<0.0)return 0.0;float t=uTime-pt;if(t<0.0||t>4.0)return 0.0;
  float pr=t*uPulseSpeed;float d=distance(wp,pp);
  return smoothstep(3.0,0.0,abs(d-pr))*smoothstep(4.0,0.0,t);
}
void main(){
  float t=position.x;vPathPosition=t;
  vec3 mid=mix(startPoint,endPoint,0.5);
  float po=sin(t*3.14159)*0.15;
  vec3 perp=normalize(cross(normalize(endPoint-startPoint),vec3(0.0,1.0,0.0)));
  if(length(perp)<0.1)perp=vec3(1.0,0.0,0.0);
  mid+=perp*po;
  vec3 p0=mix(startPoint,mid,t);vec3 p1=mix(mid,endPoint,t);
  vec3 fp=mix(p0,p1,t);
  float n=snoise(vec3(pathIndex*0.08,t*0.6,uTime*0.15));fp+=perp*n*0.12;
  vec3 wp=(modelMatrix*vec4(fp,1.0)).xyz;
  float tpi=0.0;for(int i=0;i<3;i++)tpi+=getPulseIntensity(wp,uPulsePositions[i],uPulseTimes[i]);
  vPulseIntensity=min(tpi,1.0);vColor=connectionColor;vConnectionStrength=connectionStrength;
  vDistanceFromCamera=length(wp-cameraPosition);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(fp,1.0);
}`;

const connectionFragmentShader = `
uniform float uTime;
uniform vec3 uPulseColors[3];
varying vec3 vColor;
varying float vConnectionStrength;
varying float vPulseIntensity;
varying float vPathPosition;
varying float vDistanceFromCamera;
void main(){
  float f1=sin(vPathPosition*25.0-uTime*4.0)*0.5+0.5;
  float f2=sin(vPathPosition*15.0-uTime*2.5+1.57)*0.5+0.5;
  float cf=(f1+f2*0.5)/1.5;
  vec3 base=vColor*(0.8+0.2*sin(uTime*0.6+vPathPosition*12.0));
  float fi=0.4*cf*vConnectionStrength;vec3 fc=base;
  if(vPulseIntensity>0.0){
    vec3 pc=mix(vec3(1.0),uPulseColors[0],0.3);
    fc=mix(base,pc*1.2,vPulseIntensity*0.7);fi+=vPulseIntensity*0.8;
  }
  fc*=(0.7+fi+vConnectionStrength*0.5);
  float ba=0.7*vConnectionStrength;float fa=cf*0.3;float a=ba+fa;
  a=mix(a,min(1.0,a*2.5),vPulseIntensity);
  float df=smoothstep(100.0,15.0,vDistanceFromCamera);
  gl_FragColor=vec4(fc,a*df);
}`;

// ─── Component ───────────────────────────────────────────────

interface LoreNeuralNetworkProps {
  graph: KnowledgeGraph | null;
  onNodeSelect?: (loreEntryIds: string[]) => void;
  isGenerating?: boolean;
}

export const LoreNeuralNetwork: React.FC<LoreNeuralNetworkProps> = ({
  graph,
  onNodeSelect,
  isGenerating = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const graphRef = useRef(graph);
  graphRef.current = graph;

  const buildScene = useCallback(() => {
    const container = containerRef.current;
    if (!container || !graph || graph.nodes.length === 0) return;

    // Cleanup previous
    cleanupRef.current?.();

    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.002);

    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 1000);
    camera.position.set(0, 8, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.6;
    controls.minDistance = 8;
    controls.maxDistance = 80;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controls.enablePan = false;

    // Bloom
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 1.6, 0.6, 0.7);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // Starfield
    const starCount = 4000;
    const starPositions: number[] = [];
    const starColors: number[] = [];
    const starSizes: number[] = [];
    for (let i = 0; i < starCount; i++) {
      const r = THREE.MathUtils.randFloat(50, 150);
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      starPositions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      starColors.push(1, 1, 1);
      starSizes.push(THREE.MathUtils.randFloat(0.1, 0.25));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    starGeo.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float size; attribute vec3 color; varying vec3 vColor; uniform float uTime;
        void main(){ vColor=color; vec4 mv=modelViewMatrix*vec4(position,1.0);
          float tw=sin(uTime*2.0+position.x*100.0)*0.3+0.7;
          gl_PointSize=size*tw*(300.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vColor; void main(){ vec2 c=gl_PointCoord-0.5;float d=length(c);
        if(d>0.5)discard; float a=1.0-smoothstep(0.0,0.5,d); gl_FragColor=vec4(vColor,a*0.8); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // Pulse uniforms
    const pulseUniforms = {
      uTime: { value: 0 },
      uPulsePositions: { value: [new THREE.Vector3(1e3,1e3,1e3), new THREE.Vector3(1e3,1e3,1e3), new THREE.Vector3(1e3,1e3,1e3)] },
      uPulseTimes: { value: [-1e3, -1e3, -1e3] },
      uPulseColors: { value: [new THREE.Color(1,1,1), new THREE.Color(1,1,1), new THREE.Color(1,1,1)] },
      uPulseSpeed: { value: 18.0 },
      uBaseNodeSize: { value: 0.6 },
    };

    // Build network from KnowledgeGraph data
    const nodeMap = new Map<string, { pos: THREE.Vector3; type: KnowledgeNode['type']; level: number; size: number; dist: number }>();
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const totalNodes = graph.nodes.length;

    graph.nodes.forEach((node, i) => {
      const typeIndex = NODE_TYPE_ORDER.indexOf(node.type);
      const layer = typeIndex >= 0 ? typeIndex + 1 : 3;
      const radius = layer * 3.5;
      const phi = Math.acos(1 - 2 * (i + 0.5) / totalNodes);
      const theta = 2 * Math.PI * i / goldenRatio;
      const pos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      );
      const mentionCount = node.loreEntryIds?.length || 1;
      nodeMap.set(node.id, {
        pos, type: node.type, level: layer,
        size: Math.min(0.6 + mentionCount * 0.3, 2.0),
        dist: radius,
      });
    });

    // Nodes geometry
    const nPos: number[] = [];
    const nTypes: number[] = [];
    const nSizes: number[] = [];
    const nColors: number[] = [];
    const nDists: number[] = [];
    const orderedIds: string[] = [];

    graph.nodes.forEach((node) => {
      const data = nodeMap.get(node.id)!;
      orderedIds.push(node.id);
      nPos.push(data.pos.x, data.pos.y, data.pos.z);
      nTypes.push(data.level > 3 ? 1 : 0);
      nSizes.push(data.size);
      nDists.push(data.dist);
      const col = NODE_TYPE_COLORS[node.type] || [0.7, 0.7, 0.7];
      const c = new THREE.Color(col[0], col[1], col[2]);
      c.offsetHSL(THREE.MathUtils.randFloatSpread(0.04), THREE.MathUtils.randFloatSpread(0.06), THREE.MathUtils.randFloatSpread(0.06));
      nColors.push(c.r, c.g, c.b);
    });

    const nodesGeo = new THREE.BufferGeometry();
    nodesGeo.setAttribute('position', new THREE.Float32BufferAttribute(nPos, 3));
    nodesGeo.setAttribute('nodeType', new THREE.Float32BufferAttribute(nTypes, 1));
    nodesGeo.setAttribute('nodeSize', new THREE.Float32BufferAttribute(nSizes, 1));
    nodesGeo.setAttribute('nodeColor', new THREE.Float32BufferAttribute(nColors, 3));
    nodesGeo.setAttribute('distanceFromRoot', new THREE.Float32BufferAttribute(nDists, 1));

    const nodesMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(pulseUniforms),
      vertexShader: nodeVertexShader,
      fragmentShader: nodeFragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const nodesMesh = new THREE.Points(nodesGeo, nodesMat);
    scene.add(nodesMesh);

    // Connections geometry
    const cPos: number[] = [];
    const cStart: number[] = [];
    const cEnd: number[] = [];
    const cStrength: number[] = [];
    const cColors: number[] = [];
    const cPathIdx: number[] = [];
    let pathIdx = 0;

    graph.edges.forEach((edge) => {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) return;
      const segments = 20;
      for (let i = 0; i < segments; i++) {
        cPos.push(i / (segments - 1), 0, 0);
        cStart.push(s.pos.x, s.pos.y, s.pos.z);
        cEnd.push(t.pos.x, t.pos.y, t.pos.z);
        cPathIdx.push(pathIdx);
        cStrength.push(edge.strength);
        const sCol = NODE_TYPE_COLORS[nodeMap.get(edge.source)?.type || 'concept'] || [0.5, 0.5, 0.5];
        const tCol = NODE_TYPE_COLORS[nodeMap.get(edge.target)?.type || 'concept'] || [0.5, 0.5, 0.5];
        const mixedColor = new THREE.Color(
          (sCol[0] + tCol[0]) / 2,
          (sCol[1] + tCol[1]) / 2,
          (sCol[2] + tCol[2]) / 2,
        );
        cColors.push(mixedColor.r, mixedColor.g, mixedColor.b);
      }
      pathIdx++;
    });

    const connGeo = new THREE.BufferGeometry();
    connGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
    connGeo.setAttribute('startPoint', new THREE.Float32BufferAttribute(cStart, 3));
    connGeo.setAttribute('endPoint', new THREE.Float32BufferAttribute(cEnd, 3));
    connGeo.setAttribute('connectionStrength', new THREE.Float32BufferAttribute(cStrength, 1));
    connGeo.setAttribute('connectionColor', new THREE.Float32BufferAttribute(cColors, 3));
    connGeo.setAttribute('pathIndex', new THREE.Float32BufferAttribute(cPathIdx, 1));

    const connMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(pulseUniforms),
      vertexShader: connectionVertexShader,
      fragmentShader: connectionFragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const connMesh = new THREE.LineSegments(connGeo, connMat);
    scene.add(connMesh);

    // Click → pulse + select
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 1.5 };
    const pointer = new THREE.Vector2();
    let lastPulseIdx = 0;

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(nodesMesh);

      if (intersects.length > 0) {
        const idx = intersects[0].index!;
        const nodeId = orderedIds[idx];
        const gNode = graphRef.current?.nodes.find(n => n.id === nodeId);
        if (gNode && onNodeSelect) onNodeSelect(gNode.loreEntryIds);
      }

      // Pulse at click position
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1).copy(camera.position).normalize(), 0);
      plane.constant = -plane.normal.dot(camera.position) + camera.position.length() * 0.5;
      const pt = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, pt)) {
        const time = clock.getElapsedTime();
        lastPulseIdx = (lastPulseIdx + 1) % 3;
        nodesMat.uniforms.uPulsePositions.value[lastPulseIdx].copy(pt);
        nodesMat.uniforms.uPulseTimes.value[lastPulseIdx] = time;
        connMat.uniforms.uPulsePositions.value[lastPulseIdx].copy(pt);
        connMat.uniforms.uPulseTimes.value[lastPulseIdx] = time;
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = 'position:absolute;pointer-events:none;background:rgba(0,0,0,0.8);color:white;padding:6px 10px;border-radius:8px;font-size:12px;opacity:0;transition:opacity 0.15s;z-index:20;border:1px solid rgba(255,255,255,0.1);';
    container.appendChild(tooltip);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(nodesMesh);
      if (intersects.length > 0) {
        const idx = intersects[0].index!;
        const nodeId = orderedIds[idx];
        const gNode = graphRef.current?.nodes.find(n => n.id === nodeId);
        if (gNode) {
          tooltip.innerHTML = `<strong>${gNode.label}</strong><br/><span style="opacity:0.6">${gNode.type}</span>`;
          tooltip.style.opacity = '1';
          tooltip.style.left = `${e.clientX - rect.left + 12}px`;
          tooltip.style.top = `${e.clientY - rect.top - 10}px`;
          renderer.domElement.style.cursor = 'pointer';
        }
      } else {
        tooltip.style.opacity = '0';
        renderer.domElement.style.cursor = 'crosshair';
      }
    };
    renderer.domElement.addEventListener('mousemove', handleMouseMove);

    // Animate
    const clock = new THREE.Clock();
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      controls.update();
      nodesMat.uniforms.uTime.value = elapsed;
      connMat.uniforms.uTime.value = elapsed;
      starMat.uniforms.uTime.value = elapsed;
      composer.render();
    };
    animate();

    // Resize
    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      composer.setSize(nw, nh);
    };
    const resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(container);

    cleanupRef.current = () => {
      cancelAnimationFrame(animId);
      resizeObs.disconnect();
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      tooltip.remove();
      nodesGeo.dispose(); nodesMat.dispose();
      connGeo.dispose(); connMat.dispose();
      starGeo.dispose(); starMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [graph, onNodeSelect]);

  useEffect(() => {
    buildScene();
    return () => { cleanupRef.current?.(); };
  }, [buildScene]);

  if (isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black rounded-xl border border-white/5">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-400 mx-auto animate-spin" />
          <p className="text-sm text-white/40">Mapping the world...</p>
        </div>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black rounded-xl border border-white/5">
        <div className="text-center space-y-3">
          <Network className="w-10 h-10 text-white/10 mx-auto" />
          <p className="text-sm text-white/20">Click "Map World" in the chat to generate a knowledge graph</p>
        </div>
      </div>
    );
  }

  // Legend
  const typesInGraph = [...new Set(graph.nodes.map(n => n.type))];

  return (
    <div className="flex-1 flex flex-col bg-black rounded-xl border border-white/5 overflow-hidden relative">
      <div ref={containerRef} className="flex-1" style={{ minHeight: 0 }} />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3 bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10">
        {typesInGraph.map((t) => {
          const c = NODE_TYPE_COLORS[t];
          return (
            <div key={t} className="flex items-center gap-1.5 text-[11px] text-white/50">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: `rgb(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)})` }} />
              {t}
            </div>
          );
        })}
      </div>
      {/* Stats */}
      <div className="absolute top-3 right-3 text-[11px] text-white/30 bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10">
        {graph.nodes.length} entities · {graph.edges.length} connections
      </div>
    </div>
  );
};
