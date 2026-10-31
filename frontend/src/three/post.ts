import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

/**
 * The lens: light shafts traced from the sun across the depth buffer (screen-space god rays),
 * bloom on the sun, lamps and lit windows, then a gentle film grade with vignette and grain.
 * Each ray marches from a pixel toward the sun and gathers open sky along the way, so arches,
 * palms and rooftops cut real shadows into the haze.
 */
export interface Post {
  render: (scene: THREE.Scene, camera: THREE.Camera, look: PostLook) => void;
  setSize: () => void;
  dispose: () => void;
}

export interface PostLook {
  /** Sun position on screen, 0..1 (may sit outside the frame). */
  sun: THREE.Vector2;
  /** Strength of the light shafts, 0 when the sun is down or behind the camera. */
  rays: number;
  rayColor: THREE.Color;
  bloom: number;
  time: number;
}

const VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

const RAYS = `
uniform sampler2D tColor;uniform sampler2D tDepth;uniform vec2 sun;uniform float aspect;varying vec2 vUv;
const int N=56;
void main(){
  vec2 d=(vUv-sun)*(0.92/float(N));
  vec2 uv=vUv;float acc=0.;float decay=1.;
  for(int i=0;i<N;i++){
    uv-=d;
    vec2 cu=clamp(uv,0.001,.999);
    float sky=step(.99999,texture2D(tDepth,cu).x);
    vec3 c=texture2D(tColor,cu).rgb;
    float l=dot(c,vec3(.299,.587,.114));
    acc+=sky*smoothstep(.42,1.,l)*decay;
    decay*=.968;
  }
  acc/=float(N)*.42;
  float near=1.-smoothstep(0.,1.25,length((vUv-sun)*vec2(aspect,1.)));
  gl_FragColor=vec4(vec3(acc*near*near),1.);
}`;

const FINAL = `
uniform sampler2D tColor;uniform sampler2D tRays;uniform vec3 rayColor;uniform float rays;uniform float time;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec3 c=texture2D(tColor,vUv).rgb;
  float r=texture2D(tRays,vUv).r;
  // light shafts are added as scattered light: they lift and warm the haze rather than paint over it
  c+=rayColor*r*rays*(1.-c*.7);
  float l=dot(c,vec3(.2126,.7152,.0722));
  c=mix(vec3(l),c,1.02);
  c=(c-.5)*1.02+.5;
  c+=vec3(.018,.008,-.012)*smoothstep(.45,1.,l)+vec3(-.008,0.,.016)*(1.-smoothstep(0.,.35,l));
  vec2 q=vUv-.5;
  c*=1.-.08*dot(q,q)*1.7;
  c+=(hash(vUv*vec2(1731.,977.)+fract(time))-.5)*.008;
  gl_FragColor=vec4(clamp(c,0.,1.),1.);
}`;

export function createPost(renderer: THREE.WebGLRenderer, small: boolean): Post {
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const depth = new THREE.DepthTexture(size.x, size.y);
  const sceneRT = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: small ? 0 : 4, depthTexture: depth });
  const raysRT = new THREE.WebGLRenderTarget(Math.ceil(size.x / 2), Math.ceil(size.y / 2), { type: THREE.HalfFloatType });
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.15, 0.4, 0.97);

  const raysMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: RAYS,
    uniforms: { tColor: { value: sceneRT.texture }, tDepth: { value: depth }, sun: { value: new THREE.Vector2() }, aspect: { value: 1 } },
    depthTest: false,
    depthWrite: false,
  });
  const finalMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FINAL,
    uniforms: { tColor: { value: sceneRT.texture }, tRays: { value: raysRT.texture }, rayColor: { value: new THREE.Color() }, rays: { value: 0 }, time: { value: 0 } },
    depthTest: false,
    depthWrite: false,
  });
  const raysQuad = new FullScreenQuad(raysMat);
  const finalQuad = new FullScreenQuad(finalMat);

  return {
    render(scene, camera, look) {
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);

      raysMat.uniforms.sun.value.copy(look.sun);
      raysMat.uniforms.aspect.value = size.x / size.y;
      if (look.rays > 0.001) {
        renderer.setRenderTarget(raysRT);
        raysQuad.render(renderer);
      }

      bloom.strength = look.bloom;
      bloom.render(renderer, sceneRT, sceneRT, 0, false);

      finalMat.uniforms.rayColor.value.copy(look.rayColor);
      finalMat.uniforms.rays.value = look.rays;
      finalMat.uniforms.time.value = look.time;
      renderer.setRenderTarget(null);
      finalQuad.render(renderer);
    },
    setSize() {
      renderer.getDrawingBufferSize(size);
      sceneRT.setSize(size.x, size.y);
      raysRT.setSize(Math.ceil(size.x / 2), Math.ceil(size.y / 2));
      bloom.setSize(size.x / 2, size.y / 2);
    },
    dispose() {
      sceneRT.dispose();
      depth.dispose();
      raysRT.dispose();
      bloom.dispose();
      raysMat.dispose();
      finalMat.dispose();
      raysQuad.dispose();
      finalQuad.dispose();
    },
  };
}
