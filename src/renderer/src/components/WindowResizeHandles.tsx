import { useWindowDrag, type ResizeDirection } from '@/lib/use-window-drag'

const ALL_DIRECTIONS: ResizeDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
/** The right edge only: the toolbar, glued to the main window by its left edge, height its button row */
const RIGHT_EDGE: ResizeDirection[] = ['e']

export function WindowResizeHandles({
  enabled,
  edges = 'all',
  nonActivating = false
}: {
  enabled: boolean
  edges?: 'all' | 'right'
  /**
   * Set for a window that can never be activated (the overlay toolbar): Windows
   * discards the press that lands on one, so the drag has to be picked up from
   * the first move made with the button already down. Left off elsewhere — in a
   * normal window that move is someone dragging a selection past the edge.
   */
  nonActivating?: boolean
}) {
  const startResize = useWindowDrag(enabled)

  if (!enabled) return null

  const rightOnly = edges === 'right'
  const directions = rightOnly ? RIGHT_EDGE : ALL_DIRECTIONS

  return directions.map((direction) => (
    <div
      key={direction}
      className={`window-resize-handle window-resize-${direction}${
        rightOnly ? ' window-resize-no-corners' : ''
      }`}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        startResize(event, direction)
      }}
      onPointerMove={
        nonActivating
          ? (event) => {
              if (event.buttons !== 1) return
              startResize(event, direction)
            }
          : undefined
      }
    />
  ))
}
