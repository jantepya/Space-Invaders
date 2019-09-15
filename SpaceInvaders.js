
var canvas;
var gl;

var gameover;
var gamepause;
var gamescore;

var WIDTH;
var HEIGHT;
var RATIO;

var BLOCKRADIUS = 0.08;
var LIMIT = 1-(BLOCKRADIUS/2);
var OFFSET ;

var PLAYER_MOVEMENT_SPEED    = 0.0082;
var ALIEN_MOVEMENT_SPEED     = 0.003;

var ALIEN_MOVEMENT_RANGE     = 0.2;

var ALIEN_FALL_SPEED_DEFAULT = 0.0005;
var ALIEN_FALL_ACCELERATION  = 0.0001;
var ALIEN_ACCELERATION       = 0.0002;
var ALIEN_COUNT_DEFAULT      = 14;
var ALIEN_ROW_COUNT_DEFAULT  = 7;
var ALIEN_SHOOT_FREQUENCY    = 100; // Every x amount of frames
var BULLET_SPEED             = 0.023;

var FPS_INTERVAL = 1000 / 60;

var then;

var player = [];
var player_bullets = [];
var player_movement = 0;
var player_position = 0;

var pressed = false;
var aliens = [];
var alien_bullets = [];
var alien_count = ALIEN_COUNT_DEFAULT; // even numbers only
var alien_count_front = Math.floor(ALIEN_COUNT_DEFAULT/2);
var alien_shoot_timer = 0;
var alien_movement = [];
var alien_origin = [];
var alien_fall_speed = ALIEN_FALL_SPEED_DEFAULT;

var quitGame = 1;
var score = 0;

var pBuffer;
var program;
var pPosition;
var colorLoc;

player_default = [
  vec2(-0.05,-1.0),
  vec2(-0.05,-0.9),
  vec2(-0.04,-0.9),

  vec2(-0.05,-1.0),
  vec2(-0.04,-0.9),
  vec2(-0.04,-1.0),

  vec2(-0.04,-0.95),
  vec2(-0.04,-1.0),
  vec2(0.04,-1.0),

  vec2(0.04,-1.0),
  vec2(0.04,-0.95),
  vec2(-0.04,-0.95),

  vec2(0.05,-1.0),
  vec2(0.05,-0.9),
  vec2(0.04,-0.9),

  vec2(0.05,-1.0),
  vec2(0.04,-0.9),
  vec2(0.04,-1.0),

  vec2(0.02,-0.95),
  vec2(0.0,-0.91),
  vec2(-0.02,-0.95),
]

alien_default = [
  vec2(-0.04, 1.0),
  vec2(-0.04, 0.84),
  vec2(-0.025, 0.84),

  vec2(-0.04, 1.0),
  vec2(-0.025, 1.0),
  vec2(-0.025, 0.84),

  vec2(0.04, 1.0),
  vec2(0.025, 1.0),
  vec2(0.025, 0.84),

  vec2(0.04, 1.0),
  vec2(0.04, 0.84),
  vec2(0.025, 0.84),

  vec2(0.025, 0.88),
  vec2(-0.025, 0.92),
  vec2(-0.025, 0.88),

  vec2(0.025, 0.88),
  vec2(0.025, 0.92),
  vec2(-0.025, 0.92),

  vec2(0.025, 1.0),
  vec2(-0.025, 0.96),
  vec2(-0.025, 1.0),

  vec2(0.025, 0.96),
  vec2(0.025, 1.0),
  vec2(-0.025, 0.96),

  vec2(0.01, 0.96),
  vec2(-0.01, 0.92),
  vec2(-0.01, 0.96),

  vec2(0.01, 0.92),
  vec2(0.01, 0.96),
  vec2(-0.01, 0.92),
]

window.onload = init;
window.addEventListener("click", shootCannon);
window.addEventListener("keydown", getKey);
window.addEventListener("keyup", releaseKey);
window.addEventListener('resize', resizeCanvas);

function getKey(key) {
  pressed = true;
  console.log(key);
  if (key.keyCode === 37)
    // Arrow left
    player_movement = -PLAYER_MOVEMENT_SPEED;
  else if (key.keyCode === 39)
    // Arrow right
    player_movement = PLAYER_MOVEMENT_SPEED;
  else
    player_movement = 0;

  if (key.keyCode === 82) {
    // R
    restart();
  }

  if (key.keyCode === 80){
    // P
    PauseGame();
  }
}

function restart() {
  resetGame();
  render();
}

function releaseKey(key) {
  pressed = false;
  player_movement = 0;
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


function Update_Score() {
  score += 1;
  gamescore.innerText  = score;
}

function init() {

    canvas = document.getElementById( "gl-canvas" );
    gameover = document.getElementById( "Game_Over" );
    gamepause = document.getElementById( "Game_Pause" );
    gamescore = document.getElementById( "score" );

    resetGame();

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
  alien_shoot_timer   = 0;
  player_position     = 0;
  player_movement     = 0;
  player              = player_default.slice(0);;
  player_bullets      = [];
  alien_bullets       = [];
  alien_origin        = [];
  quitGame            = 1;
  score               = 0;
  gameover.hidden     = true;
  gamepause.hidden    = true;
  gamescore.innerText = score;
  window.addEventListener("click", shootCannon);
  resizeCanvas();
  generateAliens();
  reset_time();

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


    x += interval - ((Math.random()*100)%interval)/2;
    var x1 = (2*x - WIDTH)/WIDTH;
    var new_alien = alien_default.slice(0);
    for (var j=0; j<new_alien.length; j++) {
      new_alien[j] =  vec2(new_alien[j][0] + x1, new_alien[j][1]-margin);
    }
    aliens = aliens.concat(new_alien);
    alien_origin.push(x1);

  }
}

function addNewAlien() {
  // set up random start directions
  var dir = Math.random() > 0.5 ? 1 : -1;
  alien_movement.push(dir * ALIEN_MOVEMENT_SPEED);

  var x1 = 2 * Math.random() -1 ;
  x1 = Math.max( -1+BLOCKRADIUS, x1);
  x1 = Math.min( 1-BLOCKRADIUS, x1);
  var new_alien = alien_default.slice(0);
  for (var j=0; j<new_alien.length; j++) {
    new_alien[j] =  vec2(new_alien[j][0] + x1, new_alien[j][1] + 0.2);
  }
  aliens = aliens.concat(new_alien);
  alien_origin.push(x1);
}

function shootCannon() {
  player_bullets.push(vec2(player_position - 0.5*OFFSET, -1 + 2* BLOCKRADIUS));
  player_bullets.push(vec2(player_position, -1 + 2.7* BLOCKRADIUS));
  player_bullets.push(vec2(player_position + 0.5*OFFSET, -1 + 2* BLOCKRADIUS));
}

function Alien_Fire(index) {
  if (alien_shoot_timer === ALIEN_SHOOT_FREQUENCY) {
    alien_shoot_timer = 0;
    for (i=alien_count - alien_count_front; i<alien_count; i++) {
            var j = i*alien_default.length;
            alien_bullets.push(vec2( aliens[j+2][0] + 0.005,    aliens[j][1] -0.05));
            alien_bullets.push(vec2( aliens[j+7][0] - 0.025, aliens[j][1] - 0.095));
            alien_bullets.push(vec2( aliens[j+7][0] - 0.005,    aliens[j][1] - 0.05));
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
    else {
      for (i=0; i<player_default.length; i++) {
        player[i] = vec2(player[i][0] + player_movement, player[i][1]);
      }
    }
  }

}

function Alien_Movement() {

  for (i=0; i<aliens.length; i+=alien_default.length) {
    var k = i/alien_default.length;
    for (j=0; j<alien_default.length; j++) {
      aliens[i+j] = vec2(aliens[i+j][0] + alien_movement[k], aliens[i+j][1] - alien_fall_speed);
    }
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
  for (i=0; i<alien_bullets.length; i+=3) {
      alien_bullets[i]   = vec2(alien_bullets[i][0], alien_bullets[i][1] - BULLET_SPEED);
      alien_bullets[i+1] = vec2(alien_bullets[i+1][0], alien_bullets[i+1][1] - BULLET_SPEED);
      alien_bullets[i+2] = vec2(alien_bullets[i+2][0], alien_bullets[i+2][1] - BULLET_SPEED);
  }
}

function Alien_Collisions() {

  for (i=0; i<aliens.length; i+=alien_default.length) {
    var j = i / alien_default.length;
    if (aliens[i][0] <= -1)
      alien_movement[j] = -alien_movement[j]  ;
    else if (aliens[i + 6][0] >= 1)
      alien_movement[j] = -alien_movement[j];
    else if (aliens[i][0] < alien_origin[j] - ALIEN_MOVEMENT_RANGE ||
             aliens[i + 2][0] > alien_origin[j] + ALIEN_MOVEMENT_RANGE)
      alien_movement[j] = -alien_movement[j];
    if (aliens[i+1][1] < -1) {
      GameOver();
    }
  }

}

function Remove_Player_Bullet(index) {
  player_bullets.splice(index,3);
}

function Remove_Alien_Bullet(index) {
  alien_bullets.splice(index,3);
}


function Remove_Alien(index) {

  aliens.splice(index, alien_default.length);
  alien_movement.splice(index/alien_default.length,1);
  alien_origin.splice(index/alien_default.length,1);
  Update_Score();
  addNewAlien();

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
      var j = i*alien_default.length;
      if (player_bullets[index+1][1] > aliens[j+1][1] && player_bullets[index+1][1] < aliens[j][1]) {
        if (player_bullets[index+2][0] > aliens[j][0] && player_bullets[index][0] < aliens[j+6][0]) {
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
  for (i=0; i<alien_bullets.length; i+=3) {
      if (alien_bullets[i+1][1] < -1) {
        Remove_Alien_Bullet(i);
      }
      else if (alien_bullets[i+1][1] < player[2][1]) {
        if (alien_bullets[i][0] < player[12][0] && alien_bullets[i+2][0] > player[0][0])
          GameOver();
      }
  }
}

function GameOver() {
  gameover.hidden  = false;
  quitGame = 0;
}



function render() {

    if (quitGame === 0) {
      return
    }

    now = Date.now();
    elapsed = now - then;

    if (elapsed > FPS_INTERVAL) {
      then = now - (elapsed % FPS_INTERVAL);

      Player_Movement();
      Alien_Movement();
      Alien_Fire();
      Bullet_Movement();

      gl.clear( gl.COLOR_BUFFER_BIT );
      gl.viewport( 0, 0, WIDTH, HEIGHT );

      gl.bufferData( gl.ARRAY_BUFFER, flatten(player.concat(player_bullets, aliens, alien_bullets)),  gl.STATIC_DRAW);

      gl.uniform4fv(colorLoc, [0.0, 1.0, 0.0, 1.0]);  // set color
      gl.drawArrays( gl.TRIANGLES, 0, player.length + player_bullets.length); // draw player + bullets


      gl.uniform4fv(colorLoc, [1.0, 0.0, 0.0, 1.0]);  // set color
      gl.drawArrays( gl.TRIANGLES, player.length + player_bullets.length, aliens.length + alien_bullets.length); // aliens + bullets


      Player_Bullet_Collisions();
      Alien_Bullet_Collisions();
      Alien_Collisions();

    }

    window.requestAnimFrame(render);
}
