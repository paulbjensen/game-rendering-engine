# TODO List

- [x] Make the click track to the exact tile it is over - at the moment it has a skew effect depending on x/y position of click relative to the center of the tile.
- [x] Be able to switch between navigation and edit modes to implement drag and drop in combo with the 
- [x] Be able to drag and drop a selection of tiles so that you can create roads easily, (or do cleanup for example)
- [x] Create curved road corners and junctions that look nice.
- [x] Make the tile selector render in a separate canvas layer above the existing map layer - so that ctx.clear() on it helps to reduce the need to redraw the whole map.
- [x] Refine the drag-and-drop so that it only applies a preview and does not depend on redrawing the whole scene
- [x] Implement a preview of the item being applied when doing click/drag-and-drop tiles for adding items into the canvas
- [ ] Work out how to handle and apply window device pixel ratio to the rendering of the map and to movement controls
- [x] Create a Map class that handles the map data, the tiles, and rendering
- [x] Create a Camera class that handles moving about the map based on keyboard/touch/mouse controls
- [x] Be able to save maps in some way, either to localStorage or do a DB/Rest API
- [ ] Work out how to implement Sprites so that you can have animations based on states
- [ ] Work out how to implement physics maps that so that characters cannot walk through objects like walls
- [x] Work out what eventEmitter mappings to setup so that components can be decoupled and re-used
- [x] Add a script to work out what the size of the dist is and measure it
- [x] Add husky hooks
- [x] Setup unit tests
- [x] use dvh for the height of the canvas to support tablet devices