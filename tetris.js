
const Shape = {
  'L': 'UDDR',
  'R': 'UDDL',
  'T': 'UDLRR',
  'O': 'DLU',
  'I': 'UUDDD',
  'Z': 'LRDR',
  'S': 'RLDL',
};

const keyMap = {
  'KeyA': 'left',
  'ArrowLeft': 'left',
  'KeyD': 'right',
  'ArrowRight': 'right',
  'KeyP': 'pause',
  'KeyS': 'down',
  'ArrowDown': 'down',
  'Enter': 'drop',
  'Space': 'rotate',
}

const Shapes = [
  Shape.L, Shape.R,
  Shape.T, Shape.T,
  Shape.O, Shape.O,
  Shape.I, Shape.I,
  Shape.Z, Shape.S
];

const Colors = ['red', 'green', 'blue', 'purple', 'orange', 'yellow', 'cyan'];

const gridRows = 22;
const gridColumns = 14;
const tileWidth = 30;
const tileHeight = 30;

const tickPeriod = 10;

// create web audio api context
var audioCtx = new(window.AudioContext || window.webkitAudioContext)();

function createNote(frequency, duration) {
  // create Oscillator node
  var oscillator = audioCtx.createOscillator();

  oscillator.type = 'square';
  oscillator.frequency.value = frequency; // value in hertz
  oscillator.connect(audioCtx.destination);
  oscillator.duration = duration;
  return oscillator;
}

function playSingleNote(frequency, duration) {
  var oscillator = createNote(frequency, duration);
  oscillator.start();
  setTimeout(function() {
    oscillator.stop();
  }, oscillator.duration);
}

function playMelody(notes) {
  if (notes.length == 0) {
    return;
  }

  var oscillator = createNote(notes[0][0], notes[0][1]);
  notes.shift();
  oscillator.start();
  setTimeout(function() {
    oscillator.stop();
    playMelody(notes);
  }, oscillator.duration);
}

function clearClassList(element) {
  var classList = element.classList;
  while (classList.length > 0) {
   classList.remove(classList.item(0));
  }
}

function swapClasses(elA, elB) {
  var aClasses = elA.className.split(" ");
  var bClasses = elB.className.split(" ");
  clearClassList(elA);
  clearClassList(elB);
  aClasses.forEach(cls => elB.classList.add(cls));
  bClasses.forEach(cls => elA.classList.add(cls));
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function randIndex(max) {
  return Math.floor(Math.random() * max);
}

function isStickyPress(key) {
  return key > 0 && key < 6 || key > 32;
}

function isSinglePress(key) {
  return key > 0 && key < 6;
}

function Point(x, y) {
  this.x = x;
  this.y = y;
}

Point.prototype.isInBounds = function(topBound) {
 return this.x >= 0 && this.x < topBound.x &&
        this.y >= 0 && this.y < topBound.y;
}

Point.prototype.isInHorizontalBounds = function(topBound) {
 return this.x >= 0 && this.x < topBound.x;
}

Point.prototype.isInVerticalBounds = function(topBound) {
 return this.y >= 0 && this.y < topBound.y;
}

Point.prototype.translate = function(offset) {
  return new Point(this.x + offset.x, this.y + offset.y);
}

const Direction = {
  'U': [new Point(0, -1), new Point(1, 0), new Point(0, 1), new Point(-1, 0)],
  'R': [new Point(1, 0), new Point(0, 1), new Point(-1, 0), new Point(0, -1)],
  'D': [new Point(0, 1), new Point(-1, 0), new Point(0, -1), new Point(1, 0)],
  'L': [new Point(-1, 0), new Point(0, -1), new Point(1, 0), new Point(0, 1)],
};

function Piece(grid, shape, color, rotation, position) {
  this.grid = grid;
  this.shape = shape;
  this.color = color;
  this.position = position;
  this.placed = false;
  this.setRotation(rotation);
}

Piece.prototype.isTouchingBottom = function() {
  for (var coord of this.getVisibleCoordinates()) {
    coord = coord.translate(new Point(0, 1));
    if (coord.y >= this.grid.height) {
      return true;
    }
    var cell = this.grid.getCell(coord);
    if (cell.classList.contains('placed')) {
      return true;
    }
  }
  return false;
}

Piece.prototype.isTouchingTop = function() {
  for (var coord of this.getCoordinates()) {
    coord = coord.translate(new Point(0, 1));
    if (!coord.isInBounds(this.grid.bounds)) {
      continue;
    }
    var cell = this.grid.getCell(coord);
    if (coord.y == 0 && cell.classList.contains('placed')) {
      return true;
    }
  }
  return false;
}

Piece.prototype.getTouchingEdge = function() {
  for (var coord of this.getVisibleCoordinates()) {
    var leftCoord = coord.translate(new Point(-1, 0));
    if (leftCoord.x < 0) {
      return -1
    }
    var leftCell = this.grid.getCell(leftCoord);
    if (leftCell.classList.contains('placed')) {
      return -1;
    }
    var rightCoord = coord.translate(new Point(1, 0));
    if (rightCoord.x >= this.grid.width) {
      return 1;
    }
    var rightCell = this.grid.getCell(rightCoord);
    if (rightCell.classList.contains('placed')) {
      return 1;
    }
  }
  return 0;
}

Piece.prototype.setRotation = function(rotation) {
  if (this.shape == Shape.O) {
    this.rotation = 0;
  } else if (this.shape == Shape.Z || this.shape == Shape.S) {
    this.rotation = rotation % 2;
  } else {
    this.rotation = rotation % 4;
  }
}

Piece.prototype.rotate = function() {
  this.render(false);

  var oldRotation = this.rotation;
  var oldPosition = this.position;

  this.setRotation(this.  rotation + 1);

  for (var i = 0; i < 2 && !this.isInValidHorizontalPosition(); i++) {
    this.moveBy(this.getTouchingEdge() * -1, 0);
  }

  if (!this.isInValidHorizontalPosition()) {
    this.rotation = oldRotation;
    this.position = oldPosition;
  }

  this.render(true);
}


Piece.prototype.isInValidHorizontalPosition = function() {
  for (const coord of this.getCoordinates()) {
    if (!coord.isInHorizontalBounds(this.grid.bounds)) {
      return false;
    }
    if (!coord.isInVerticalBounds(this.grid.bounds)) {
      continue;
    }
    if (this.grid.getCell(coord).classList.contains('placed')) {
      return false;
    }
  }
  return true;
}

Piece.prototype.isInValidPosition = function() {
  for (const coord of this.getCoordinates()) {
    if (!coord.isInBounds(this.grid.bounds)) {
      return false;
    }
    if (this.grid.getCell(coord).classList.contains('placed')) {
      return false;
    }
  }
  return true;
}

Piece.prototype.shift = function(direction) {
  this.render(false);
  this.moveBy(direction, 0);
  if (!this.isInValidHorizontalPosition()) {
    this.moveBy(-direction, 0);
  }
  this.render(true);
}

Piece.prototype.fall = function() {
  if (this.isTouchingBottom()) {
    this.placed = true;
    this.render(true);
    return;
  }
  this.render(false);
  this.moveBy(0, 1);
  this.render(true);
}

Piece.prototype.moveBy = function(x, y) {
  this.position = this.position.translate(new Point(x, y));
}

Piece.prototype.renderToDisplayGrid = function(grid) {
  grid.reset();
  var coordinates = this.getCoordinates();
  var minX = Math.min.apply(null, coordinates.map(coord => coord.x));
  var minY = Math.min.apply(null, coordinates.map(coord => coord.y));
  for (var coord of coordinates) {
    var cell = grid.getCell(coord.translate(new Point(-minX, -minY)));
    cell.classList.add('block');
    cell.classList.add(this.color);
  }
}

Piece.prototype.getVisibleCoordinates = function() {
  return this.getCoordinates().filter(
    coord => coord.isInBounds(this.grid.bounds));
}

Piece.prototype.getCoordinates = function() {
  var offset = this.position;
  var coordinates = [offset];
  for (var dir of this.shape) {
    offset = offset.translate(Direction[dir][this.rotation]);
    coordinates.push(offset);
  }
  return coordinates;
}

Piece.prototype.bottom = function() {
  return Math.max.apply(null, this.getCoordinates().map(coord =>  coord.y));
}

Piece.prototype.render = function(isActive) {
  var offset = this.position;
  for (var coord of this.getVisibleCoordinates()) {
    var cell = this.grid.getCell(coord);
    if (this.placed) {
      cell.classList.remove('block');
      cell.classList.add('placed');
      cell.classList.add(this.color);
    } else if (isActive) {
      cell.classList.add('block');
      cell.classList.add(this.color);
    } else {
      cell.classList.remove('block');
      cell.classList.remove(this.color);
    }
  }
}

function createTile(row, column) {
  var tile = document.createElement('div');
  tile.classList.add('tile');
  tile.style.top = (row * tileHeight) + 'px';
  tile.style.left = (column * tileWidth) + 'px';
  tile.style.width = tileWidth + 'px';
  tile.style.height = tileHeight + 'px';
  return tile;
}

function createGrid(parent, width, height) {
  var grid = [];
  for (var i = 0; i < height; i++) {
    var row = [];
    for (var j = 0; j < width; j++) {
      var tile = createTile(i, j)
      parent.appendChild(tile);
      row.push(tile);
    }
    grid.push(row);
  }
  parent.style.width = (width * tileWidth) + 'px';
  parent.style.height = (height * tileHeight) + 'px';
  grid.width = width;
  grid.height = height;
  grid.bounds = new Point(width, height);
  grid.getCell = function(p) {
    return grid[p.y][p.x];
  }
  grid.reset = function(callback) {
    for (var i = 0; i < grid.height; i++) {
      grid.resetRow(i);
    }
  }
  grid.isFullRow = function(row) {
    for (var j = 0; j < grid.width; j++) {
      if (!grid[row][j].classList.contains('placed')) {
        return false;
      }
    }
    return true;
  }
  grid.resetRow = function(row) {
    for (var j = 0; j < grid.width; j++) {
      var tile = grid[row][j];
      clearClassList(tile);
      tile.classList.add('tile');
    }
  }
  grid.rowHasActiveBlock = function(row) {
   for (var j = 0; j < grid.width; j++) {
      var tile = grid[row][j];
      if (tile.classList.contains('block')) {
        return true;
      }
    }
    return false;
  }
  grid.swapRows = function(rowA, rowB) {
    for (var j = 0; j < grid.width; j++) {
      swapClasses(grid[rowA][j], grid[rowB][j])
    }
  }
  grid.dropTo = function(row) {
    grid.resetRow(row);
    for (var i = row - 1; i >= 0 && !grid.rowHasActiveBlock(i); i--) {
      grid.swapRows(i, i + 1);
    }
  }
  return grid;
}

function Game() {}

Game.prototype.reset = function() {
  if (this.tickInterval) {
    clearInterval(this.tickInterval);
  }
  document.removeEventListener('keydown', this.keydown);
  document.removeEventListener('keyup', this.keyup);
  this.keys = {
    'up': 0,
    'down': 0,
    'right': 0,
    'left': 0,
    'rotate': 0,
    'drop': 0,
    'pause': 0,
  }
  this.piece = null;
  this.timer = 0;
  this.gameOver = false;
  this.fallPeriod = 60;
  this.dropping = false;
  this.grid.reset();
  this.paused = false;
  this.score = 0;
  this.rowsClearedForCurrentBlock = 0;
  this.updateScore(0);
  console.log("Game has been reset");
}

Game.prototype.load = function(options) {
  this.grid = createGrid(options.grid, gridColumns, gridRows);
  this.nextBlockGrid = createGrid(options.nextBlock, 4, 4);
  this.gridElement = options.grid;
  this.scoreElement = options.score;
  this.containerElement = options.container;
  this.nextBlockElement = options.nextBlock;
  this.pauseElement = options.pause;
  this.keydown = this.keydown.bind(this);
  this.keyup = this.keyup.bind(this);
  console.log("Game loaded.");
  this.reset();

  this.containerElement.style.width = this.gridElement.style.width;
  this.containerElement.style.height = this.gridElement.style.height;
}

Game.prototype.spawnPiece = function() {
  const shape = Shapes[randIndex(Shapes.length)];
  const color = Colors[randIndex(Colors.length)];
  const rotation = randIndex(4);
  const startPoint = new Point(1 + randIndex(this.grid.width - 4), -3);
  var piece = new Piece(this.grid, shape, color, rotation, startPoint);
  return piece;
}

Game.prototype.keydown = function(e) {
  if (e.code in keyMap && this.keys[keyMap[e.code]] == 0) {
    this.keys[keyMap[e.code]] = 1;
  }
}

Game.prototype.keyup = function(e) {
  if (e.code in keyMap) {
    this.keys[keyMap[e.code]] = 0;
  }
}

Game.prototype.start = function() {
  this.piece = this.spawnPiece();
  this.nextPiece = this.spawnPiece();
  this.nextPiece.renderToDisplayGrid(this.nextBlockGrid);
  this.tickInterval = setInterval(this.tick.bind(this), tickPeriod);
  document.addEventListener('keydown', this.keydown);
  document.addEventListener('keyup', this.keyup);
  console.log("Game started");
}

Game.prototype.fall = function() {
  if (!this.piece) {
    return;
  }
  if (this.piece.isTouchingTop()) {
    playSingleNote(120, 200);
    this.gameOver = true;
    this.togglePause();
    return;
  }
  this.piece.fall();

  if (this.piece.placed) {
    playSingleNote(160, 20);
    this.dropping = false;
    this.piece = this.nextPiece;
    this.nextPiece = this.spawnPiece();
    this.nextPiece.renderToDisplayGrid(this.nextBlockGrid);
  }
}

Game.prototype.maybeClear = function() {
  var baseNoteOffsets = [0, 40, 60, 80];
  var baseNote = baseNoteOffsets[this.rowsClearedForCurrentBlock % 4];
  for (var row = this.grid.height - 1; row >= 0; row--) {
    if (this.grid.isFullRow(row)) {
      this.grid.dropTo(row);
      playMelody(
        [
          [(baseNote + 220) * 1, 20], [0, 30],
          [(baseNote + 220) * 2, 20], [0, 30],
          [(baseNote + 220) * 4, 20], [0, 30],
          [(baseNote + 220) * 8, 20], [0, 30],
        ]);
      this.updateScore(10);
      this.updateSpeed();
      this.rowsClearedForCurrentBlock++;
      return true;
    }
  }
  this.rowsClearedForCurrentBlock = 0;
  return false;
}

Game.prototype.updateSpeed = function() {
  if (this.score % 50 == 0) {
    this.fallPeriod = Math.max(6, this.fallPeriod - 1);
  }
}

Game.prototype.updateScore = function(points) {
  this.score += points;
  this.scoreElement.innerHTML = this.score;
}

Game.prototype.togglePause = function() {
  this.paused = !this.paused;
  this.pauseElement.innerHTML = this.gameOver ? "Game Over" : "Paused";
  this.pauseElement.style.visibility = this.paused ? "visible" : "hidden";
}

Game.prototype.shift = function(amount) {
  this.piece.shift(amount);
}

Game.prototype.drop = function() {
  this.dropping = true;
}

Game.prototype.rotate = function() {
  this.piece.rotate();
}

Game.prototype.tick = function() {
  if (isSinglePress(this.keys.pause)) {
    this.togglePause();
    this.keys.pause += 20;
  }

  if (this.paused) {
    return;
  }

  if (this.gameOver) {
    this.reset();
    this.start();
    return;
  }

  if (this.timer % 10 == 0) {
    this.maybeClear();
  }

  if (this.rowsClearedForCurrentBlock > 0) {
    this.timer += 1;
    return;
  }

  if (this.keys.drop) {
    this.drop();
  }

  if (this.timer % 5 == 0) {
    if (this.keys.down > 4) {
      playSingleNote(320, 10);
      this.fall();
    }

    if (this.keys.down > 16) {
      playSingleNote(320, 10);
      this.fall();
    }

    if (isStickyPress(this.keys.left)) {
      playSingleNote(360, 10);
      playSingleNote(420, 10);
      this.shift(-1);
    }

    if (isStickyPress(this.keys.right)) {
      playSingleNote(360, 10);
      playSingleNote(420, 10);
      this.shift(1);
    }

    if (isSinglePress(this.keys.rotate)) {
      playSingleNote(220, 20);
      this.rotate();
      this.keys.rotate += 20;
    }
  }

  if (this.dropping || this.timer % this.fallPeriod == 0) {
    this.fall();
  }

  for (var key in this.keys) {
    if (this.keys[key] > 0) {
     this.keys[key] += 1;
    }
  }

  this.timer += 1;
}
