/* Cipher background: a very low-contrast tonal field with film grain (WebGL, domain-warped noise).
   Window.Aurora.set(true) eases the colours and speed to the calm "ink green" mood. */
(function () {
  const c = document.getElementById('bg'), gl = c.getContext('webgl');
  if (!gl) { document.body.classList.add('nogl'); return; }

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const DAY  = { c: [hex('#E4E8E2'), hex('#DBE3DD'), hex('#EAE3D2')], s: .5 };
  const CALM = { c: [hex('#080F0D'), hex('#0F1B18'), hex('#17302A')], s: .35 };
  let cur = JSON.parse(JSON.stringify(DAY)), tgt = DAY;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `precision mediump float;
  uniform vec2 r;uniform float t;uniform vec3 a,b,d;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,s=.5;for(int i=0;i<5;i++){v+=s*n(p);p*=2.;s*=.5;}return v;}
  void main(){
    vec2 u=gl_FragCoord.xy/r.y;
    float q=fbm(u*1.5+vec2(t*.05,-t*.03));
    float w=fbm(u*2.1+q*2.2+vec2(-t*.04,t*.06));
    vec3 col=mix(a,b,smoothstep(.2,.8,q));
    col=mix(col,d,smoothstep(.45,.95,w)*.75);
    col+=(h(gl_FragCoord.xy+t)-.5)*.022;
    gl_FragColor=vec4(col,1.);}`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(pr); gl.useProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { document.body.classList.add('nogl'); return; }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);

  const size = () => { c.width = innerWidth * .5; c.height = innerHeight * .5; gl.viewport(0, 0, c.width, c.height); };
  addEventListener('resize', size); size();

  let time = 0, last = performance.now();
  (function frame(now) {
    const dt = (now - last) / 1000; last = now;
    for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) cur.c[k][j] += (tgt.c[k][j] - cur.c[k][j]) * .03;
    cur.s += (tgt.s - cur.s) * .03;
    if (!still) time += dt * cur.s;
    gl.uniform2f(U('r'), c.width, c.height); gl.uniform1f(U('t'), time + 20);
    gl.uniform3fv(U('a'), cur.c[0]); gl.uniform3fv(U('b'), cur.c[1]); gl.uniform3fv(U('d'), cur.c[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  })(last);

  window.Aurora = { set: calm => { tgt = calm ? CALM : DAY; } };
})();