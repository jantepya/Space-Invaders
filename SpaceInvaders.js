// // TODO:
// image resize working
// cooler shapes
// Fix alien regen logic

var canvas;
var gl;
var gameover;
var gamepause;

var WIDTH;
var HEIGHT;
var RATIO;

var BLOCKRADIUS = 0.08;
var LIMIT = 1-(BLOCKRADIUS/2);
var OFFSET ;

var PLAYER_MOVEMENT_SPEED    = 0.008;
var ALIEN_MOVEMENT_SPEED     = 0.003;

var ALIEN_MOVEMENT_RANGE     = 0.1;

var ALIEN_FALL_SPEED_DEFAULT = 0.0005;
var ALIEN_FALL_ACCELERATION  = 0.0001;
var ALIEN_ACCELERATION       = 0.0002;
var ALIEN_COUNT_DEFAULT      = 14;
var ALIEN_ROW_COUNT_DEFAULT  = 7;
var ALIEN_SHOOT_FREQUENCY    = 100; // Every x amount of frames
var BULLET_SPEED             = 0.025;

var FPS_INTERVAL = 1000 / 60;

var then;

var player = [];
var player_bullets = [];
var player_movement = 0;
var player_position = 0;
var alien_bullet_count = 0;

var pressed = false;
var aliens = [];
var alien_bullets = [];
var alien_count = ALIEN_COUNT_DEFAULT; // even numbers only
var alien_count_front = Math.floor(ALIEN_COUNT_DEFAULT/2);
var alien_shoot_timer = 0;
var alien_movement = [];
var alien_fall_speed = ALIEN_FALL_SPEED_DEFAULT;

var quitGame = 1;

var pBuffer;
var program;
var pPosition;
var colorLoc;

window.onload = init;
window.addEventListener("click", shootCannon);
window.addEventListener("keydown", getKey);
window.addEventListener("keyup", releaseKey);
window.addEventListener('resize', resizeCanvas);


function getKey(key) {
  pressed = true;
  if (key.code === "ArrowLeft")
    player_movement = -PLAYER_MOVEMENT_SPEED;
  else if (key.code === "ArrowRight")
    player_movement = PLAYER_MOVEMENT_SPEED;
  else
    player_movement = 0;

  if (key.code === 'KeyR') {
    resetGame();
  }

  if (key.code == 'KeyP'){
    PauseGame();
  }
}

function releaseKey(key) {
  pressed = false;
}

function resizeCanvas() {
  var width = canvas.clientWidth;
  var height = canvas.clientHeight;
  if (canvas.width != width ||
      canvas.height != height) {
    canvas.width = width;
    canvas.height = height;
  }
  WIDTH = canvas.width;
  HEIGHT = canvas.height;
  RATIO = HEIGHT/WIDTH;
  OFFSET = BLOCKRADIUS*RATIO;
}

function reset_time() {
  then = Date.now();
}

function init() {

    canvas = document.getElementById( "gl-canvas" );
    gameover = document.getElementById( "Game_Over" );
    gamepause = document.getElementById( "Game_Pause" );
    gameover.hidden = true;
    gamepause.hidden = true;

    resizeCanvas();
    generateAliens();
    reset_time();

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, WIDTH, HEIGHT );
    gl.clearColor( 0, 0, 0, 0 );

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    pPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( pPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( pPosition );

    colorLoc = gl.getUniformLocation(program, "vColor");

    render();
};

function resetGame() {
  window.removeEventListener("click", shootCannon);
  aliens              = [];
  alien_count         = ALIEN_COUNT_DEFAULT;
  alien_fall_speed    = ALIEN_FALL_SPEED_DEFAULT;
  alien_count_front   = Math.floor(ALIEN_COUNT_DEFAULT/2);
  alien_bullet_count  = 0;
  alien_shoot_timer   = 0;
  player_position     = 0;
  player_movement     = 0;
  player              = [];
  player_bullets      = [];
  alien_bullets       = [];
  quitGame            = 1;
  gameover.hidden     = true;
  window.addEventListener("click", shootCannon);
  generateAliens();
  reset_time();
  resizeCanvas();

  render();
}

function PauseGame() {
  if (quitGame == 0) {
    quitGame = 1;
    gamepause.hidden = true;
    window.addEventListener("click", shootCannon);
    render();
  }
  else {
    quitGame = 0;
    gamepause.hidden = false;
    window.removeEventListener("click", shootCannon);
  }
}

function QuitGame() {
  aliens              = [];
  player              = [];
  alien_count         = 0;
  alien_count_front   = 0;
  alien_bullet_count  = 0;
  quitGame            = 0;
  window.removeEventListener("click", shootCannon);
}

function generateAliens() {
  var interval = WIDTH / alien_count_front;
  var x = 0;
  var margin = BLOCKRADIUS/8;

  for (i=0; i<alien_count; i++)
  {
    // set up random start directions
    var dir = Math.random() > 0.5 ? 1 : -1;
    alien_movement[i] = dir * ALIEN_MOVEMENT_SPEED;

    // second row
    if (i === alien_count_front) {
      x = 0;
      margin += 2*margin + 2*BLOCKRADIUS;
    }

    // commpute random starting position
    x += interval - ((Math.random()*100)%interval)/2;
    var x1 = (2*x - WIDTH)/WIDTH - BLOCKRADIUS;
    var x2 = x1+(2*BLOCKRADIUS*RATIO);
    var y1 = 1-margin;
    var y2 = y1 - 2*BLOCKRADIUS;

    aliens.push(vec2(x1, y2))
    aliens.push(vec2(x1, y1))
    aliens.push(vec2(x2, y1))

    aliens.push(vec2(x2, y2))
    aliens.push(vec2(x1, y2))
    aliens.push(vec2(x2, y1))
  }
}

function addNewAlien(x_start) {
  // set up random start directions
  var dir = Math.random() > 0.5 ? 1 : -1;
  alien_movement.push(dir * ALIEN_MOVEMENT_SPEED);

  var x1 = x_start;
  var x2 = x1+(2*BLOCKRADIUS*RATIO);
  var y1 = 1 + 2*BLOCKRADIUS;
  var y2 = 1;

  aliens.push(vec2(x1, y2))
  aliens.push(vec2(x1, y1))
  aliens.push(vec2(x2, y1))

  aliens.push(vec2(x2, y2))
  aliens.push(vec2(x1, y2))
  aliens.push(vec2(x2, y1))

}

function shootCannon() {
  player_bullets.push(vec2(player_position - 0.5*OFFSET, -1 + 2* BLOCKRADIUS));
  player_bullets.push(vec2(player_position, -1 + 2.7* BLOCKRADIUS));
  player_bullets.push(vec2(player_position + 0.5*OFFSET, -1 + 2* BLOCKRADIUS));
}

function Alien_Fire(index) {
  if (alien_shoot_timer === ALIEN_SHOOT_FREQUENCY) {
    alien_shoot_timer = 0;
    if (alien_count_front > 0) {
      for (i=alien_count - alien_count_front; i<=alien_count-1; i++) {
          var j = i*6;
          alien_bullet_count += 1;
          alien_bullets.push(vec2( aliens[j][0]  + 0.4*OFFSET,    aliens[j][1]));
          alien_bullets.push(vec2( aliens[j][0]  + OFFSET, aliens[j][1] - 1.2*OFFSET));
          alien_bullets.push(vec2( aliens[j+2][0]- 0.4*OFFSET,    aliens[j][1]));
      }
    }
    else {
      for (i=0; i<=alien_count; i++) {
          var j = i*6;
          alien_bullet_count += 1;
          aliens.push(vec2( aliens[j][0]  + 0.5*OFFSET,    aliens[j][1]));
          aliens.push(vec2( aliens[j][0]  + OFFSET, aliens[j][1] - OFFSET));
          aliens.push(vec2( aliens[j+2][0]- 0.5*OFFSET,    aliens[j][1]));
      }
    }
    alien_fall_speed += ALIEN_FALL_ACCELERATION;
  }
  else {
    alien_shoot_timer+=1;
  }
}

function Player_Movement() {
  if (pressed) {
    player_position += player_movement;
    if (player_position > LIMIT) {
      player_position = LIMIT
    }
    else if (player_position < -LIMIT) {
      player_position = -LIMIT
    }
  }

  player[0] = vec2( player_position - OFFSET, -1);
  player[1] = vec2( player_position - OFFSET, -1 + 2* BLOCKRADIUS );
  player[2] = vec2( player_position + OFFSET, -1 + 2* BLOCKRADIUS );
  player[3] = vec2( player_position + OFFSET, -1);
  player[4] = vec2( player_position - OFFSET, -1);
  player[5] = vec2( player_position + OFFSET, -1 + 2* BLOCKRADIUS );
}

function Alien_Movement() {
  for (i=0; i<alien_count; i++) {
    var j = 6*i;
    aliens[j]     = vec2(aliens[j][0]     + alien_movement[i],aliens[j][1]     - alien_fall_speed);
    aliens[j + 1] = vec2(aliens[j + 1][0] + alien_movement[i],aliens[j + 1][1] - alien_fall_speed);
    aliens[j + 2] = vec2(aliens[j + 2][0] + alien_movement[i],aliens[j + 2][1] - alien_fall_speed);
    aliens[j + 3] = vec2(aliens[j + 3][0] + alien_movement[i],aliens[j + 3][1] - alien_fall_speed);
    aliens[j + 4] = vec2(aliens[j + 4][0] + alien_movement[i],aliens[j + 4][1] - alien_fall_speed);
    aliens[j + 5] = vec2(aliens[j + 5][0] + alien_movement[i],aliens[j + 5][1] - alien_fall_speed);
  }
}

function Bullet_Movement() {
  // Player Cannon
  for (i=0; i<player_bullets.length; i+=3) {
    player_bullets[i]   = vec2(player_bullets[i][0],   player_bullets[i][1] + BULLET_SPEED);
    player_bullets[1+i] = vec2(player_bullets[1+i][0], player_bullets[1+i][1] + BULLET_SPEED);
    player_bullets[2+i] = vec2(player_bullets[2+i][0], player_bullets[2+i][1] + BULLET_SPEED);
  }
  // Alien Cannon
  var j = alien_count * 6;
  for (i=0; i<3*alien_bullet_count; i+=3) {
      alien_bullets[i]   = vec2(alien_bullets[i][0], alien_bullets[i][1] - BULLET_SPEED);
      alien_bullets[i+1] = vec2(alien_bullets[i+1][0], alien_bullets[i+1][1] - BULLET_SPEED);
      alien_bullets[i+2] = vec2(alien_bullets[i+2][0], alien_bullets[i+2][1] - BULLET_SPEED);
  }
}

function Alien_Collisions() {

  for (i=0; i<alien_count; i++) {
    if (aliens[i*6][0] <= -1)
      alien_movement[i] = -alien_movement[i]  ;
    else if (aliens[i*6 + 2][0] >= 1)
      alien_movement[i] = -alien_movement[i];
    if (aliens[i*6][1] < -1) {
      GameOver();
    }
  }

  for (i=1; i<alien_count; i++) {
    //console.log(i, Math.floor(alien_count/2));
    if (aliens[i*6][0] <= aliens[i*6 - 4][0] && aliens[i*6][1] === aliens[i*6 - 2][1]) {
      alien_movement[i]   = -alien_movement[i] + ALIEN_ACCELERATION;
      alien_movement[i-1] = -alien_movement[i-1] - ALIEN_ACCELERATION;
    }
  }
}

function Remove_Player_Bullet(index) {
  player_bullets.splice(index,3);
}

function Remove_Alien_Bullet(index) {
  alien_bullet_count -= 1;
  alien_bullets.splice(index,3);
}

function Remove_Alien(index) {
  // alien_count -= 1;
  var x_pos = aliens[index][0];
  aliens.splice(index, 6);
  alien_movement.splice(index/6,1);
  addNewAlien(x_pos);
  // if (index/6 > alien_count - alien_count_front - 1)
  //   alien_count_front -= 1;
}

function Player_Bullet_Collisions() {
  var index = 0;
  while (index < player_bullets.length) {
    var inc = true;

    // remove if bullet collides with top of canvas
    if (player_bullets[index][1] > 1) {
      Remove_Player_Bullet(index);
      continue;
    }

    // remove if bullet collides with alien
    for (i=0; i<alien_count; i++) {
      var j = 6*i;
      if (player_bullets[index+1][1] > aliens[j][1] && player_bullets[index+1][1] < aliens[j+1][1]) {
        if (player_bullets[index+2][0] > aliens[j][0] && player_bullets[index][0] < aliens[j+2][0]) {
          Remove_Player_Bullet(index);
          Remove_Alien(j);
          inc = false;
          break;
        }
      }
    }
    if (inc)
      index += 3;
  }
}

function Alien_Bullet_Collisions() {
  for (i=0; i<3*alien_bullet_count; i+=3) {
      if (alien_bullets[i+1][1] < -1) {
        Remove_Alien_Bullet(i);
      }
      else if (alien_bullets[i+1][1] < player[2][1]) {
        if (alien_bullets[i][0] < player[2][0] && alien_bullets[i+2][0] > player[0][0])
          GameOver();
      }
  }
}

function GameOver() {
  var gameover = document.getElementById( "Game_Over" );
  gameover.hidden  = false;
  quitGame = 0;
}

function Check_Game_Status() {
  if (alien_count === 0) {
    alert("You WIN!!!!");
    resetGame();
  }
}

function render() {

    now = Date.now();
    elapsed = now - then;

    if (quitGame === 0) {
      return
    }

    if (elapsed > FPS_INTERVAL) {
      then = now - (elapsed % FPS_INTERVAL);


      Check_Game_Status();
      Player_Movement();
      Alien_Movement();
      Alien_Fire();
      Bullet_Movement();

      gl.clear( gl.COLOR_BUFFER_BIT );
      gl.viewport( 0, 0, WIDTH, HEIGHT );

      gl.bufferData( gl.ARRAY_BUFFER, flatten(player.concat(player_bullets, aliens, alien_bullets)),  gl.STATIC_DRAW);

      gl.uniform4fv(colorLoc, [0.0, 1.0, 0.0, 1.0]);  // set color
      gl.drawArrays( gl.TRIANGLES, 0, 6 + player_bullets.length);

      gl.uniform4fv(colorLoc, [1.0, 0.0, 0.0, 1.0]);  // set color
      gl.drawArrays( gl.TRIANGLES, 6 + player_bullets.length, aliens.length + alien_bullets.length);


      Player_Bullet_Collisions();
      Alien_Bullet_Collisions();
      Alien_Collisions();

    }

    window.requestAnimFrame(render);
}
