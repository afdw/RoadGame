/**
 * {WebGLRenderingContext}
 */
let gl;
let $canvas;
let $buttonLeft;
let $buttonRight;

function initGL() {
    gl = $canvas.getContext("webgl");
}

function getShader(gl, id) {
    const shaderScript = document.getElementById(id);
    if(!shaderScript) {
        return null;
    }

    let str = "";
    let k = shaderScript.firstChild;
    while(k) {
        if(k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    let shader;
    if(shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if(shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

let shaderProgram;

function initShaders() {
    const fragmentShader = getShader(gl, "shader-fs");
    const vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}


function handleLoadedTexture(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    //noinspection JSCheckFunctionSignatures
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.hint(gl.GENERATE_MIPMAP_HINT, gl.NICEST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    let ext = null;
    ext = ext ? ext : gl.getExtension("MOZ_EXT_texture_filter_anisotropic");
    ext = ext ? ext : gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
    ext = ext ? ext : gl.getExtension("EXT_texture_filter_anisotropic");
    if(ext) {
        gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 16);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
}

let texture;

function initTexture() {
    texture = gl.createTexture();
    texture.image = new Image();
    texture.image.onload = function() {
        handleLoadedTexture(texture)
    };
    texture.image.src = "img/road.png";
}

let mvMatrix = mat4.create();
const mvMatrixStack = [];
const pMatrix = mat4.create();

function mvPushMatrix() {
    const copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if(mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

let cubeVertexPositionBuffer;
let cubeVertexTextureCoordBuffer;
let cubeVertexIndexBuffer;

function initBuffers() {
    cubeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    const vertices = [
        -0.5, 0, -0.5,
        0.5, 0, -0.5,
        0.5, 0, 0.5,
        -0.5, 0, 0.5
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeVertexPositionBuffer.itemSize = 3;
    cubeVertexPositionBuffer.numItems = 4;

    cubeVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    const textureCoords = [
        1, 1,
        0, 1,
        0, 0,
        1, 0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    cubeVertexTextureCoordBuffer.itemSize = 2;
    cubeVertexTextureCoordBuffer.numItems = 4;

    cubeVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    const cubeVertexIndices = [
        2, 1, 0, 3, 2, 0,
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    cubeVertexIndexBuffer.itemSize = 1;
    cubeVertexIndexBuffer.numItems = 6;
}

let lastTime = 0;
let offset = 0;
let speed = 0;
let shift = 0;
let shiftSpeed = 0;
let leftPressed = false, rightPressed = false;

function tick() {
    requestAnimationFrame(tick);
    $canvas.width = window.innerWidth;
    $canvas.height = window.innerHeight;
    gl.viewportWidth = $canvas.width;
    gl.viewportHeight = $canvas.height;
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 1000, pMatrix);
    mat4.identity(mvMatrix);
    mat4.rotate(mvMatrix, -shiftSpeed * 10, [0, 1, 0]);
    mat4.scale(mvMatrix, [20, 20, 200]);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    for(let i = 0; i < 10; i++) {
        mvPushMatrix();
        mat4.translate(mvMatrix, [shift, -0.3, offset - i]);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        mvPopMatrix();
    }
    const timeNow = new Date().getTime();
    if(lastTime != 0) {
        const elapsed = timeNow - lastTime;
        offset += elapsed * speed;
        offset %= 1;
        speed += 0.00001;
        speed = Math.min(speed, 0.0007);
        if(leftPressed) {
            shiftSpeed += 0.001;
            shiftSpeed = Math.min(shiftSpeed, 0.01);
            $buttonLeft.className = "button left hover";
        } else {
            $buttonLeft.className = "button left";
        }
        if(rightPressed) {
            shiftSpeed -= 0.001;
            shiftSpeed = Math.max(shiftSpeed, -0.01);
            $buttonRight.className = "button right hover";
        } else {
            $buttonRight.className = "button right";
        }
        shift += shiftSpeed;
        shift = Math.min(shift, 0.5);
        shift = Math.max(shift, -0.5);
        shiftSpeed *= 0.9;
    }
    lastTime = timeNow;
}

function webGLStart() {
    $canvas = document.querySelector("canvas");
    $buttonLeft = document.querySelector(".button.left");
    $buttonRight = document.querySelector(".button.right");
    $buttonLeft.onmouseover = e => leftPressed = true;
    $buttonLeft.addEventListener("touchstart", e => leftPressed = true, false);
    $buttonLeft.onmouseout = e => leftPressed = false;
    $buttonLeft.addEventListener("touchend", e => leftPressed = false, false);
    $buttonRight.onmouseover = e => rightPressed = true;
    $buttonRight.addEventListener("touchstart", e => rightPressed = true, false);
    $buttonRight.onmouseout = e => rightPressed = false;
    $buttonRight.addEventListener("touchend", e => rightPressed = false, false);
    $canvas.addEventListener("touchend", e => leftPressed = rightPressed = false, false);
    document.oncontextmenu = e => e.preventDefault();
    initGL();
    initShaders();
    initBuffers();
    initTexture();

    gl.clearColor(0.2, 0.5, 0.7, 1);
    gl.enable(gl.DEPTH_TEST);

    tick();
}

window.onload = webGLStart;