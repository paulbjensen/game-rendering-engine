# TODO List

- [x] Make the click track to the exact tile it is over - at the moment it has a skew effect depending on x/y position of click relative to the center of the tile.
- [x] Be able to switch between navigation and edit modes to implement drag and drop in combo with the 
- [ ] Be able to drag and drop a selection of tiles so that you can create roads easily, (or do cleanup for example)
- [x] Create curved road corners and junctions that look nice.
- [ ] Make the tile selector render in a separate canvas layer above the existing map layer - so that ctx.clear() on it helps to reduce the need to redraw the whole map.
- [ ] Work out how to handle and apply window device pixel ratio to the rendering of the map and to movement controls
- [x] Create a Map class that handles the map data, the tiles, and rendering
- [x] Create a Camera class that handles moving about the map based on keyboard/touch/mouse controls
- [ ] Be able to save maps in some way, either to localStorage or do a DB/Rest API
- [ ] Work out how to implement Sprites so that you can have animations based on states
- [ ] Work out how to implement physics maps that so that characters cannot walk through objects like walls
- [x] Work out what eventEmitter mappings to setup so that components can be decoupled and re-used
- [x] Add a script to work out what the size of the dist is and measure it
- [ ] Add husky hooks
- [ ] Setup unit tests
