import React, {useState, useRef, useEffect} from 'react';
import {Button, StyleSheet, Text, View, AppState} from 'react-native';
import {Camera, CameraType} from 'expo-camera';
import {GLView} from 'expo-gl';

const vertShaderSource = `#version 300 es
precision highp float;
in vec2 position;
out vec2 uv;
void main() {
  uv = position;
  gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
}`;

const fragShaderSource = `#version 300 es
precision highp float;
uniform sampler2D cameraTexture;
in vec2 uv;
out vec4 fragColor;
void main() {
  fragColor = texture(cameraTexture, uv);
}`;

const App = () => {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const glRef = useRef<any>();
  const cameraRef = useRef<any>();
  const animationFrameRef = useRef<any>();

  useEffect(() => {
    return () => {
      if (animationFrameRef !== undefined) {
        console.log('clear');
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationFrameRef]);
  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={{textAlign: 'center'}}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }
  console.log('test');

  const createCameraTexture = async () => {
    const texture = glRef.current?.createCameraTextureAsync(cameraRef.current);
    console.log('created');
    return texture;
  };

  const onContextCreate = async (_gl: any) => {
    const cameraTexture = await createCameraTexture();

    // Compile vertex and fragment shaders
    const vertShader = _gl.createShader(_gl.VERTEX_SHADER);
    _gl.shaderSource(vertShader, vertShaderSource);
    _gl.compileShader(vertShader);

    const fragShader = _gl.createShader(_gl.FRAGMENT_SHADER);
    _gl.shaderSource(fragShader, fragShaderSource);
    _gl.compileShader(fragShader);

    // Link, use program, save and enable attributes
    const program = _gl.createProgram();
    _gl.attachShader(program, vertShader);
    _gl.attachShader(program, fragShader);
    _gl.linkProgram(program);
    _gl.validateProgram(program);

    _gl.useProgram(program);

    const positionAttrib = _gl.getAttribLocation(program, 'position');
    _gl.enableVertexAttribArray(positionAttrib);

    // Create, bind, fill buffer
    const buffer = _gl.createBuffer();
    _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
    const verts = new Float32Array([-2, 0, 0, -2, 2, 2]);
    _gl.bufferData(_gl.ARRAY_BUFFER, verts, _gl.STATIC_DRAW);

    // Bind 'position' attribute
    _gl.vertexAttribPointer(positionAttrib, 2, _gl.FLOAT, false, 0, 0);

    // Set 'cameraTexture' uniform
    _gl.uniform1i(_gl.getUniformLocation(program, 'cameraTexture'), 0);

    // Activate unit 0
    _gl.activeTexture(_gl.TEXTURE0);

    const loop = () => {
      animationFrameRef.current = requestAnimationFrame(loop);
      // Clear
      _gl.clearColor(0, 0, 1, 1);
      _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

      // Bind texture if created
      _gl.bindTexture(_gl.TEXTURE_2D, cameraTexture);

      // Draw!
      _gl.drawArrays(_gl.TRIANGLES, 0, verts.length / 2);
      // Submit frame
      _gl.endFrameEXP();
    };
    loop();
  };

  // <Camera style={styles.camera} type={type} />
  return (
    <View style={styles.container}>
      <Camera style={{flex: 0}} ref={cameraRef} />
      <GLView
        style={{
          flex: 1,
        }}
        ref={glRef}
        onContextCreate={onContextCreate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default App;
