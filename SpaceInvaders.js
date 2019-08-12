// // TODO:
// Get rid of multiple shader programs
// image resize working
// cooler shapes

var canvas;
var gl;

var WIDTH;
var HEIGHT;
var RATIO;

var BLOCKRADIUS = 0.08;
var LIMIT = 1-(BLOCKRADIUS/2);
var OFFSET ;

var PLAYER_MOVEMENT_SPEED    = 0.01;
var ALIEN_MOVEMENT_SPEED     = 0.003;

var ALIEN_FALL_SPEED_DEFAULT = 0.0005;
var ALIEN_FALL_ACCELERATION  = 0.0003;
var ALIEN_ACCELERATION       = 0.00025;
var ALIEN_COUNT_DEFAULT      = 12;
var ALIEN_SHOOT_FREQUENCY    = 100; // Every x amount of frames
var BULLET_SPEED             = 0.025;

var FPS_INTERVAL = 1000 / 60;

var then;

var player = [];
var player_movement = 0;
var player_position = 0;

var player_bullet_count = 0;
var alien_bullet_count = 0;

var pressed = false;
var aliens = [];
var alien_count = ALIEN_COUNT_DEFAULT; // even numbers only
var alien_count_front = Math.floor(ALIEN_COUNT_DEFAULT/2);
var alien_shoot_timer = 0;
var alien_movement = [];
var alien_fall_speed = ALIEN_FALL_SPEED_DEFAULT;

var quitGame = 1;

var pBuffer;
var aBuffer;
var program_al;
var program_pl;
var pPosition;
var aPosition;

window.onload = init;
window.addEventListener("click", shootCannon);
window.addEventListener("keydown", getKey);
window.addEventListener("keyup", releaseKey);
window.addEventListener('resize', resizeCanvas);


function getKey(key) {
  pressed = true;

  if (key.key === "ArrowLeft")
    player_movement = -PLAYER_MOVEMENT_SPEED;
  else if (key.key === "ArrowRight")
    player_movement = PLAYER_MOVEMENT_SPEED;
  else
    player_movement = 0;

  if (key.key === 'r') {
    resetGame();
  }

  if (key.key == 'q'){
    QuitGame();
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
    program_pl = initShaders( gl, "vertex-shader", "fragment-shader" );
    program_al = initShaders( gl, "vertex-shader", "fragment-shader" );
    //
    gl.useProgram( program_pl );
    pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);

    // Associate out shader variables with our data buffer
    pPosition = gl.getAttribLocation( program_pl, "vPosition" );
    gl.vertexAttribPointer( pPosition, 2, gl.FLOAT, false, 0, 0 );

    var colorLoc = gl.getUniformLocation(program_pl, "vColor");
    gl.uniform4fv(colorLoc, [0.0, 1.0, 0.0, 1.0]);  // set color

    /////
    gl.useProgram( program_al );
    aBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, aBuffer );

    aPosition = gl.getAttribLocation( program_al, "vPosition" );
    gl.vertexAttribPointer( aPosition, 2, gl.FLOAT, false, 0, 0 );

    colorLoc = gl.getUniformLocation(program_al, "vColor");
    gl.uniform4fv(colorLoc, [1.0, 0.0, 0.0, 1.0]);  // set color

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
  player_bullet_count = 0;
  player_movement     = 0;
  player              = [];
  quitGame            = 1;
  window.addEventListener("click", shootCannon);
  generateAliens();
  reset_time();
  resizeCanvas();
}

function QuitGame() {
  aliens              = [];
  player              = [];
  alien_count         = 0;
  alien_count_front   = 0;
  alien_bullet_count  = 0;
  player_bullet_count = 0;
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

function shootCannon() {
  //console.log("bam");
  player_bullet_count += 1;
  player.push(vec2(player_position - 0.5*OFFSET, -1 + 2* BLOCKRADIUS));
  player.push(vec2(player_position, -1 + 2.7* BLOCKRADIUS));
  player.push(vec2(player_position + 0.5*OFFSET, -1 + 2* BLOCKRADIUS));
}

function Alien_Fire(index) {
  if (alien_shoot_timer === ALIEN_SHOOT_FREQUENCY) {
    alien_shoot_timer = 0;
    if (alien_count_front > 0) {
      for (i=alien_count - alien_count_front; i<=alien_count; i++) {
          var j = i*6;
          alien_bullet_count += 1;
          aliens.push(vec2( aliens[j][0]  + 0.5*OFFSET,    aliens[j][1]));
          aliens.push(vec2( aliens[j][0]  + OFFSET, aliens[j][1] - OFFSET));
          aliens.push(vec2( aliens[j+2][0]- 0.5*OFFSET,    aliens[j][1]));
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
  for (i=0; i<3*player_bullet_count; i+=3) {
    player[6+i] = vec2(player[6+i][0], player[6+i][1] + BULLET_SPEED);
    player[7+i] = vec2(player[7+i][0], player[7+i][1] + BULLET_SPEED);
    player[8+i] = vec2(player[8+i][0], player[8+i][1] + BULLET_SPEED);
  }
  // Alien Cannon
  var j = alien_count * 6;
  for (i=0; i<3*alien_bullet_count; i+=3) {
      aliens[j+i]   = vec2(aliens[j+i][0], aliens[j+i][1] - BULLET_SPEED);
      aliens[j+i+1] = vec2(aliens[j+i+1][0], aliens[j+i+1][1] - BULLET_SPEED);
      aliens[j+i+2] = vec2(aliens[j+i+2][0], aliens[j+i+2][1] - BULLET_SPEED);
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
  player_bullet_count -= 1;
  player.splice(index,3);
}

function Remove_Alien_Bullet(index) {
  alien_bullet_count -= 1;
  aliens.splice(index,3);
}

function Remove_Alien(index) {
  alien_count -= 1;
  aliens.splice(index, 6);
  alien_movement.splice(index/6,1);
  if (index/6 > alien_count - alien_count_front - 1)
    alien_count_front -= 1;
}

function Player_Bullet_Collisions() {
  var index = 6;
  while (index < 3*player_bullet_count+6) {
    var inc = true;

    // remove if bullet collides with top of canvas
    if (player[index][1] > 1) {
      Remove_Player_Bullet(index);
      continue;
    }

    // remove if bullet collides with alien
    for (i=0; i<alien_count; i++) {
      var j = 6*i;
      if (player[index+1][1] > aliens[j][1] && player[index+1][1] < aliens[j+1][1]) {
        if (player[index+2][0] > aliens[j][0] && player[index][0] < aliens[j+2][0]) {
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
  var j = alien_count * 6;
  for (i=0; i<3*alien_bullet_count; i+=3) {
      if (aliens[j+i+1][1] < -1) {
        Remove_Alien_Bullet(j+i);
      }
      else if (aliens[j+i+1][1] < player[2][1]) {
        if (aliens[j+i][0] < player[2][0] && aliens[j+i+2][0] > player[0][0])
          GameOver();
      }
  }
}

function GameOver() {
  alert("GAME OVER - You lost...");
  resetGame();
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

    if (elapsed > FPS_INTERVAL) {
      then = now - (elapsed % FPS_INTERVAL);

      if (quitGame === 1) {
        Check_Game_Status();
        Player_Movement();
        Alien_Movement();
        Alien_Fire();
        Bullet_Movement();
      }

      gl.viewport(0, 0, WIDTH, HEIGHT);

      gl.clear( gl.COLOR_BUFFER_BIT );
      gl.useProgram( program_pl );
      gl.enableVertexAttribArray( pPosition );
      gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
      gl.bufferData( gl.ARRAY_BUFFER, flatten(player),  gl.STATIC_DRAW);
      gl.vertexAttribPointer( pPosition, 2, gl.FLOAT, false, 0, 0 );
      gl.drawArrays( gl.TRIANGLES, 0, 6*quitGame + 3*player_bullet_count );

      gl.useProgram( program_al );
      gl.enableVertexAttribArray( aPosition );
      gl.bindBuffer(gl.ARRAY_BUFFER, aBuffer);
      gl.bufferData( gl.ARRAY_BUFFER, flatten(aliens),  gl.STATIC_DRAW);
      gl.vertexAttribPointer( aPosition, 2, gl.FLOAT, false, 0, 0 );
      gl.drawArrays( gl.TRIANGLES, 0, 6*alien_count + 3*alien_bullet_count);

      Player_Bullet_Collisions();
      Alien_Bullet_Collisions();
      Alien_Collisions();

    }

    window.requestAnimFrame(render);
}
