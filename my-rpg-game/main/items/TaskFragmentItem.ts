import { Item } from '@rpgjs/database'

@Item({
  name: 'Task Fragment',
  description: 'A media file assigned to you for processing',
  consumable: false,
  price: 0
})
export class TaskFragmentItem {}
