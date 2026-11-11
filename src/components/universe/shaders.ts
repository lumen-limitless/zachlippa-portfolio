/**
 * GLSL for the procedural universe. Every surface is generated from noise at
 * runtime, so the scene ships no texture assets.
 */

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float a=.5;
  float s=0.;
  for(int i=0;i<5;i++){s+=a*snoise(p);p=p*2.02+11.3;a*=.5;}
  return s;
}
float fbmLow(vec3 p){
  float a=.5;
  float s=0.;
  for(int i=0;i<3;i++){s+=a*snoise(p);p=p*2.02+11.3;a*=.5;}
  return s;
}
`;

export const WORLD_VERTEX = /* glsl */ `
varying vec3 vObj;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
void main(){
  vObj=position;
  vec4 wp=modelMatrix*vec4(position,1.);
  vWorldPos=wp.xyz;
  vWorldNormal=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*wp;
}
`;

export const PLANET_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uKind;
uniform float uSeed;
uniform float uHover;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uGlow;
varying vec3 vObj;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
${NOISE}
void main(){
  vec3 p=normalize(vObj);
  vec3 N=normalize(vWorldNormal);
  vec3 L=normalize(-vWorldPos);
  vec3 V=normalize(cameraPosition-vWorldPos);
  float diff=max(dot(N,L),0.);
  vec3 col=vec3(0.);
  vec3 emissive=vec3(0.);
  float gloss=0.;

  if(uKind<.5){
    // Terran: oceans, continents, ice caps, drifting cloud, city lights.
    float h=fbm(p*2.1+uSeed);
    float land=smoothstep(.02,.09,h);
    vec3 ground=mix(uB,uC,smoothstep(.12,.5,h));
    col=mix(uA*(.7+.6*smoothstep(-.6,.02,h)),ground,land);
    float cap=smoothstep(.72,.86,abs(p.y)+fbmLow(p*4.)*.08);
    col=mix(col,vec3(.92,.96,1.),cap);
    float cloud=smoothstep(.12,.55,fbm(p*3.2+vec3(uTime*.015,0.,uTime*.006)+uSeed*2.));
    col=mix(col,vec3(1.),cloud*.75);
    gloss=(1.-land)*(1.-cloud);
    float cities=land*(1.-cap)*step(.38,snoise(p*22.+uSeed))*smoothstep(.2,.0,diff);
    emissive+=vec3(1.,.72,.35)*cities*(1.-cloud)*1.6;
  }else if(uKind<1.5){
    // Gas giant: turbulent latitude bands and a slow storm.
    float warp=fbm(p*vec3(1.6,5.,1.6)+vec3(uTime*.012,0.,0.)+uSeed);
    float bands=sin(p.y*11.+warp*2.6)*.5+.5;
    col=mix(uA,uB,bands);
    col=mix(col,uC,smoothstep(.25,.75,fbm(p*vec3(3.,9.,3.)+uSeed*3.))*.55);
    float storm=smoothstep(.32,.0,length(p-normalize(vec3(.6,-.28,.74))));
    col=mix(col,uC*1.15,storm*.7);
  }else if(uKind<2.5){
    // Lava: dark crust split by glowing fissures.
    float h=fbm(p*2.6+uSeed);
    float crack=1.-smoothstep(0.,.11,abs(fbm(p*3.4+uSeed*1.7)));
    col=mix(uA,uB,smoothstep(-.4,.5,h));
    float pulse=.75+.25*sin(uTime*.8+h*8.);
    emissive+=uC*crack*pulse*2.6;
    col*=1.-crack*.6;
  }else if(uKind<3.5){
    // Ice: pale plains scored with fracture lines.
    float h=fbm(p*2.4+uSeed);
    col=mix(uB,uA,smoothstep(-.35,.4,h));
    float crack=1.-smoothstep(0.,.035,abs(snoise(p*5.5+uSeed)+fbmLow(p*9.)*.35));
    col=mix(col,uB*.45,crack*.7);
    col=mix(col,uC,smoothstep(.3,.6,h));
    gloss=.7;
  }else{
    // Dunes: ridged terrain swept in long bands.
    float ridge=1.-abs(fbm(p*vec3(2.,5.,2.)+uSeed));
    float h=fbm(p*1.8+uSeed*2.);
    col=mix(uA,uB,smoothstep(.45,.95,ridge));
    col=mix(col,uC,smoothstep(.1,.55,h)*.75);
  }

  vec3 lit=col*(diff*1.25+.035);
  vec3 H=normalize(L+V);
  lit+=vec3(1.,.95,.85)*pow(max(dot(N,H),0.),48.)*gloss*diff*.9;
  float rim=pow(1.-max(dot(N,V),0.),3.);
  lit+=uGlow*rim*(diff*.9+.12)*.9;
  lit+=uGlow*rim*uHover*1.4;
  lit+=emissive;
  gl_FragColor=vec4(lit,1.);
}
`;

export const ATMOSPHERE_FRAGMENT = /* glsl */ `
uniform vec3 uGlow;
uniform float uHover;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
void main(){
  vec3 N=normalize(vWorldNormal);
  vec3 V=normalize(cameraPosition-vWorldPos);
  vec3 L=normalize(-vWorldPos);
  float halo=pow(clamp(-dot(N,V)*1.9,0.,1.),2.6);
  float lit=smoothstep(-.35,.6,dot(N,L));
  float strength=halo*(lit*.9+.08+uHover*.6);
  gl_FragColor=vec4(uGlow*strength,strength);
}
`;

export const RING_VERTEX = /* glsl */ `
uniform float uInner;
uniform float uOuter;
varying float vRadial;
varying vec3 vWorldPos;
void main(){
  vRadial=(length(position.xy)-uInner)/(uOuter-uInner);
  vec4 wp=modelMatrix*vec4(position,1.);
  vWorldPos=wp.xyz;
  gl_Position=projectionMatrix*viewMatrix*wp;
}
`;

export const RING_FRAGMENT = /* glsl */ `
uniform vec3 uA;
uniform vec3 uB;
uniform float uSeed;
varying float vRadial;
varying vec3 vWorldPos;
${NOISE}
void main(){
  float bands=snoise(vec3(vRadial*9.,uSeed,0.))*.5+snoise(vec3(vRadial*31.,uSeed*2.,0.))*.3;
  float alpha=smoothstep(-.25,.35,bands);
  alpha*=smoothstep(0.,.08,vRadial)*smoothstep(1.,.9,vRadial);
  float gap=smoothstep(.02,.0,abs(vRadial-.58));
  alpha*=1.-gap*.9;
  vec3 col=mix(uA,uB,vRadial+bands*.4);
  gl_FragColor=vec4(col*1.15,alpha*.75);
}
`;

export const SUN_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uHover;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
varying vec3 vObj;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
${NOISE}
void main(){
  vec3 p=normalize(vObj);
  vec3 V=normalize(cameraPosition-vWorldPos);
  float flow=fbm(p*2.4+vec3(0.,uTime*.05,uTime*.03));
  float cells=fbm(p*7.+flow*1.5-vec3(uTime*.08,0.,0.));
  float heat=smoothstep(-.55,.75,flow+cells*.7);
  vec3 col=mix(uA,uB,heat);
  col=mix(col,uC,smoothstep(.62,1.,heat));
  float limb=pow(1.-max(dot(normalize(vWorldNormal),V),0.),2.2);
  col+=uA*limb*1.2;
  gl_FragColor=vec4(col*(1.45+uHover*.6),1.);
}
`;

export const BILLBOARD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv=uv;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}
`;

export const CORONA_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uGlow;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 c=vUv-.5;
  float d=length(c)*2.;
  float angle=atan(c.y,c.x);
  float rays=fbmLow(vec3(cos(angle)*2.2,sin(angle)*2.2,uTime*.06))*.5+.5;
  float glow=pow(max(1.-d,0.),2.4);
  float streaks=pow(max(1.-d,0.),1.3)*rays*.35;
  float strength=(glow*1.3+streaks)*smoothstep(1.,.75,d);
  gl_FragColor=vec4(uGlow*strength,strength);
}
`;

export const NEBULA_VERTEX = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir=normalize(position);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}
`;

export const NEBULA_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec3 vDir;
${NOISE}
void main(){
  vec3 d=normalize(vDir);
  float drift=uTime*.004;
  float cloudA=smoothstep(.05,.75,fbm(d*1.4+vec3(drift,0.,3.)));
  float cloudB=smoothstep(.1,.8,fbm(d*2.3+vec3(7.,drift,1.)));
  float cloudC=smoothstep(.2,.9,fbmLow(d*3.6+vec3(2.,9.,drift)));
  vec3 col=vec3(.012,.014,.03);
  col+=vec3(.26,.08,.42)*cloudA*.2;
  col+=vec3(.04,.26,.36)*cloudB*.16;
  col+=vec3(.5,.12,.3)*cloudC*cloudA*.16;
  // A faint galactic band across the sky.
  vec3 axis=normalize(vec3(.35,1.,.2));
  float band=exp(-pow(dot(d,axis)*3.2,2.));
  col+=vec3(.2,.19,.3)*band*(.35+.65*smoothstep(-.2,.6,fbmLow(d*5.)))*.45;
  gl_FragColor=vec4(col,1.);
}
`;

export const STAR_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
varying vec3 vColor;
varying float vTwinkle;
void main(){
  vColor=aColor;
  vTwinkle=.7+.3*sin(uTime*(.6+aPhase*.35)+aPhase*40.);
  gl_PointSize=aSize*uPixelRatio*vTwinkle;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}
`;

export const STAR_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vTwinkle;
void main(){
  float d=length(gl_PointCoord-.5)*2.;
  float core=pow(max(1.-d,0.),2.5);
  gl_FragColor=vec4(vColor*core*vTwinkle*1.6,core);
}
`;
