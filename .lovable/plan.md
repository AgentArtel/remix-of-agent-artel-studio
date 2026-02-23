

# Add Even G1 Glasses Section with Embedded App

## What We're Building

A new sidebar group called "Even G1" with a dashboard page that embeds the external app at `https://wave-lens-flow.lovable.app` via an iframe.

## Changes

### 1. Sidebar — Add "Even G1" group

**File: `src/components/ui-custom/Sidebar.tsx`**

- Import `Glasses` icon from lucide-react
- Add a new nav group between "Game Design" and "Studio":

```
{
  label: 'Even G1',
  status: 'live',
  items: [
    { id: 'even-g1', label: 'G1 Dashboard', icon: Glasses },
  ],
}
```

- Add `'Even G1': true` to the default `openGroups` state

### 2. New page — EvenG1Dashboard

**File: `src/pages/EvenG1Dashboard.tsx`** (new)

A simple full-height page that renders the embedded app in an iframe:

```
- Page header with "Even G1 Glasses" title and an "Open in new tab" link
- Full-height iframe pointing to https://wave-lens-flow.lovable.app
- Accepts onNavigate prop to match existing page pattern
```

### 3. App routing — Wire up the new page

**File: `src/App.tsx`**

- Import `EvenG1Dashboard`
- Add `'even-g1'` to the `Page` type union
- Add case in `renderPage()`: `case 'even-g1': return <EvenG1Dashboard onNavigate={onNavigate} />`
- Add `'even-g1'` to the full-screen layout condition (alongside editor, play-game, sprite-generator) so the iframe gets maximum space without the sidebar — or keep the sidebar visible depending on preference

## Technical Notes

- The iframe uses `allow="camera;microphone;accelerometer;gyroscope"` to support any AR/sensor features the embedded app may need
- `sandbox` attribute is omitted to allow full functionality of the embedded Lovable app
- The page follows the same `onNavigate` prop pattern as all other pages

