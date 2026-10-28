import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, smooth } from './content.js';

// Deterministic procedural assets: no Igloo code, models, or textures are shipped.
function hash(x,y){const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v)}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),sx),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy)}
function fbm(x,y){let v=0,a=.5;for(let i=0;i<5;i++){v+=noise(x,y)*a;x=x*2.07+3;y=y*2.03+7;a*=.5}return v}
function frostTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');const data=ctx.createImageData(512,512);for(let y=0;y<512;y++)for(let x=0;x<512;x++){const n=fbm(x/38,y/38);const grit=hash(x,y);const c=105+n*125+grit*22;const i=(y*512+x)*4;data.data[i]=c;data.data[i+1]=c;data.data[i+2]=c;data.data[i+3]=255}ctx.putImageData(data,0,0);ctx.globalAlpha=.13;ctx.strokeStyle='#fff';ctx.lineWidth=.8;for(let k=0;k<25;k++){let x=hash(k,5)*512,y=hash(k,9)*512;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<12;j++){x+=(hash(k,j)-.5)*24;y+=hash(j,k)*18;ctx.lineTo(x,y)}ctx.stroke()}const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(1.4,1.4);return texture}
function snowTexture(){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');const g=ctx.createRadialGradient(32,32,1,32,32,31);g.addColorStop(0,'rgba(255,255,255,.8)');g.addColorStop(.3,'rgba(255,255,255,.25)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)}
export function createWorld(container, {onReady, onFail}) {
 let renderer;
 try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});} catch(error){onFail(error);return null;}
 const mobile=window.innerWidth<760;const lowPower=(navigator.deviceMemory||8)<=2||(navigator.hardwareConcurrency||8)<=2;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,lowPower?.8:mobile?1.35:1.6));
 renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0xa6afbd);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=!mobile&&!lowPower;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 container.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#a6afbd');scene.fog=new THREE.FogExp2('#a6afbd',.024);
 const camera=new THREE.PerspectiveCamera(37,innerWidth/innerHeight,.1,150);camera.position.set(7,4,12);
 let envTarget=null;if(!lowPower){const pmrem=new THREE.PMREMGenerator(renderer);const environment=new RoomEnvironment();envTarget=pmrem.fromScene(environment,.04);scene.environment=envTarget.texture;environment.dispose();pmrem.dispose();}
 const hemi=new THREE.HemisphereLight('#eaf3ff','#59677e',2.2);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#e9f2ff',3.6);sun.position.set(-7,12,7);sun.castShadow=!mobile&&!lowPower;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;scene.add(sun);
 const rim=new THREE.DirectionalLight('#eefaff',2.5);rim.position.set(6,5,-9);scene.add(rim);
 const frost=frostTexture();frost.anisotropy=4;
 const ice=new THREE.MeshPhysicalMaterial({color:'#8291a8',map:frost,bumpMap:frost,bumpScale:.115,roughness:.41,metalness:.12,clearcoat:.58,clearcoatRoughness:.24,envMapIntensity:.8});
 const snowMat=new THREE.MeshStandardMaterial({color:'#c5cedb',map:frost,bumpMap:frost,bumpScale:.1,roughness:.92,metalness:.04});
 function terrainHeight(x,z){const radius=Math.sqrt(x*x+z*z);const plateau=1-Math.exp(-radius*radius/36);const ridges=Math.pow(fbm(x*.09+18,z*.09+32),2)*10;const hills=2.2*Math.sin(x*.13+.6)*Math.cos(z*.12);return (ridges+hills)*plateau-.22;}
 const terrainGeo=new THREE.PlaneGeometry(160,160,lowPower?70:mobile?140:240,lowPower?70:mobile?140:240);terrainGeo.rotateX(-Math.PI/2);const tPos=terrainGeo.attributes.position;for(let i=0;i<tPos.count;i++){const x=tPos.getX(i),z=tPos.getZ(i);tPos.setY(i,terrainHeight(x,z));}terrainGeo.computeVertexNormals();
 const terrain=new THREE.Mesh(terrainGeo,snowMat);terrain.receiveShadow=true;scene.add(terrain);
 // Distant ridges provide atmosphere without a photographic backdrop.
 const ridgeMat=new THREE.MeshStandardMaterial({color:'#bbc5d4',map:frost,bumpMap:frost,bumpScale:.25,roughness:1});
 for(let j=0;j<7;j++){const geo=new THREE.PlaneGeometry(40,30,45,35);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);const peak=Math.exp(-(x*x/170+z*z/90));p.setY(i,peak*(6+fbm(x*.3+j,z*.3)*12)+fbm(x*.5,z*.5)*1.1);}geo.computeVertexNormals();const mountain=new THREE.Mesh(geo,ridgeMat);mountain.position.set((j-3)*23,-1,-29-hash(j,3)*14);scene.add(mountain);}
 const igloo=new THREE.Group();igloo.rotation.y=-.12;scene.add(igloo);const blocks=[];const radius=2.45;
 function register(mesh,index){mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.home=mesh.position.clone();mesh.userData.rot=mesh.rotation.clone();mesh.userData.seed=hash(index,42);mesh.geometry.computeBoundingBox();mesh.userData.direction=mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).normalize();igloo.add(mesh);blocks.push(mesh);}
 // Rounded blocks are bent to each latitude, making a continuous domed shell.
 for(let row=0;row<6;row++){const y0=row*.49;const y1=Math.min((row+1)*.49,2.8);const mid=(y0+y1)/2;const base=.6;const domeR=y=>Math.sqrt(Math.max(.13,radius*radius-Math.pow(Math.max(0,y-base),2)));
 const count=Math.max(5,Math.round(2*Math.PI*domeR(mid)/.92));const step=Math.PI*2/count;
 for(let j=0;j<count;j++){const angle=j*step+(row%2)*step*.5;const signed=Math.atan2(Math.sin(angle),Math.cos(angle));if(row<3&&Math.abs(signed)<.32)continue;
 const r=domeR(mid);const geo=new RoundedBoxGeometry(r*step-.035,y1-y0-.035,.37,3,.055);const p=geo.attributes.position;
 for(let k=0;k<p.count;k++){const y=mid+p.getY(k);const rr=domeR(y)+p.getZ(k);const a=angle+p.getX(k)/r;p.setXYZ(k,Math.sin(a)*rr,y,Math.cos(a)*rr);}geo.computeVertexNormals();register(new THREE.Mesh(geo,ice),blocks.length);}}
 // Cap and doorway with actual depth and an unlit interior.
 const cap=new THREE.Mesh(new THREE.SphereGeometry(.65,32,12,0,Math.PI*2,0,Math.PI/2),ice);cap.position.y=2.77;cap.scale.y=.24;register(cap,blocks.length);
 const entrance=new THREE.Group();entrance.position.set(0,0,2.35);igloo.add(entrance);
 for(const side of [-1,1])for(let r=0;r<2;r++){const brick=new THREE.Mesh(new RoundedBoxGeometry(.43,.49,.95,3,.055),ice);brick.position.set(side*.74,r*.5+.25,.28);brick.castShadow=true;brick.receiveShadow=true;entrance.add(brick);}
 for(let j=0;j<7;j++){const angle=j*Math.PI/7+Math.PI/14;const brick=new THREE.Mesh(new RoundedBoxGeometry(.44,.43,.95,3,.06),ice);brick.position.set(Math.cos(angle)*.75,1+Math.sin(angle)*.75,.28);brick.rotation.z=angle-Math.PI/2;brick.castShadow=true;brick.receiveShadow=true;entrance.add(brick);}
 const inner=new THREE.Mesh(new THREE.SphereGeometry(2.14,32,20,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#131e31',roughness:1,side:THREE.BackSide}));inner.scale.y=1.2;igloo.add(inner);
 const glow=new THREE.PointLight('#d9f7ff',8,8,2);glow.position.set(0,1.4,1);igloo.add(glow);
 const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.45,1),new THREE.MeshPhysicalMaterial({color:'#ecf9ff',emissive:'#9acaff',emissiveIntensity:1.4,metalness:.4,roughness:.15}));core.position.set(0,1.4,.8);igloo.add(core);
 // Three frosted displays, with purpose-built wireframe symbols inside.
 const objects=new THREE.Group();scene.add(objects);const cubes=[];
 const glass=new THREE.MeshPhysicalMaterial({color:'#c2d3e5',roughness:.3,roughnessMap:frost,bumpMap:frost,bumpScale:.04,metalness:.05,transmission:lowPower?0:.82,thickness:2,ior:1.31,clearcoat:1,envMapIntensity:1.4,transparent:true,opacity:.8});
 const lineMat=new THREE.LineBasicMaterial({color:'#f3fbff',transparent:true,opacity:.8});
 const chrome=new THREE.MeshStandardMaterial({color:'#e6f7ff',metalness:.65,roughness:.15,emissive:'#75a5c7',emissiveIntensity:.2});
 for(let i=0;i<3;i++){const group=new THREE.Group();group.position.set((i-1)*3.9,2.2,0);objects.add(group);const mesh=new THREE.Mesh(new RoundedBoxGeometry(2.3,2.3,2.3,4,.17),glass);group.add(mesh);const lines=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.28,2.28,2.28)),lineMat);group.add(lines);const cloud=new THREE.Mesh(new RoundedBoxGeometry(2.05,2.05,2.05,3,.15),new THREE.MeshStandardMaterial({color:'#dfe9f5',map:frost,transparent:true,opacity:.16,depthWrite:false,side:THREE.BackSide}));group.add(cloud);const symbol=new THREE.Group();group.add(symbol);
 if(i===0){const ball=new THREE.Mesh(new THREE.IcosahedronGeometry(.45,1),chrome);symbol.add(ball);for(let k=0;k<3;k++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.75,.025,8,70),chrome);ring.rotation.set(k*Math.PI/3,k*Math.PI/3,0);symbol.add(ring);}}
 if(i===1){for(let k=0;k<4;k++){const box=new THREE.Mesh(new RoundedBoxGeometry(.46,.46,.46,2,.06),chrome);box.position.set((k%2-.5)*.95,(Math.floor(k/2)-.5)*.95,0);symbol.add(box);}const pts=[new THREE.Vector3(-.47,-.47,0),new THREE.Vector3(.47,-.47,0),new THREE.Vector3(.47,.47,0),new THREE.Vector3(-.47,.47,0),new THREE.Vector3(-.47,-.47,0)];symbol.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMat));}
 if(i===2){const shape=new THREE.Shape();shape.moveTo(-.7,-.25);shape.lineTo(-.95,0);shape.lineTo(-.7,.25);const left=new THREE.Line(new THREE.BufferGeometry().setFromPoints(shape.getPoints()),lineMat);symbol.add(left);const right=left.clone();right.rotation.z=Math.PI;symbol.add(right);const slash=new THREE.Mesh(new THREE.BoxGeometry(.06,.85,.06),chrome);slash.rotation.z=-.3;symbol.add(slash);const frame=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7,1.2,.15)),lineMat);symbol.add(frame);}
 cubes.push({group,mesh,symbol});}
 const particlesGeo=new THREE.BufferGeometry();const count=lowPower?150:mobile?300:700;const positions=new Float32Array(count*3);for(let i=0;i<count;i++){positions[i*3]=(hash(i,1)-.5)*36;positions[i*3+1]=hash(i,2)*13;positions[i*3+2]=(hash(i,3)-.5)*28;}particlesGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));const particleMat=new THREE.PointsMaterial({color:'#ffffff',size:.045,map:snowTexture(),transparent:true,opacity:.48,depthWrite:false,blending:THREE.AdditiveBlending});const snow=new THREE.Points(particlesGeo,particleMat);scene.add(snow);
 // The closing network resolves into a floating, connected constellation.
 const constellation=new THREE.Group();scene.add(constellation);const nodes=[];const networkMat=new THREE.MeshBasicMaterial({color:'#effaff'});
 for(let i=0;i<70;i++){const phi=Math.acos(1-2*(i+.5)/70),theta=Math.PI*(1+Math.sqrt(5))*i;const p=new THREE.Vector3(Math.cos(theta)*Math.sin(phi),Math.cos(phi),Math.sin(theta)*Math.sin(phi)).multiplyScalar(2.4);const dot=new THREE.Mesh(new THREE.SphereGeometry(i%9===0?.065:.025,8,6),networkMat);dot.position.copy(p);constellation.add(dot);nodes.push(p);}
 const edges=[];for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++)if(nodes[a].distanceTo(nodes[b])<1.1)edges.push(nodes[a],nodes[b]);constellation.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edges),new THREE.LineBasicMaterial({color:'#d6eeff',transparent:true,opacity:.25})));constellation.position.set(3.3,2.5,1);
 let cubeOffsets=[9,9,9],pointer={x:0,y:0},progress=0,softProgress=0,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,hovered=-1,raf=0,disposed=false,time=0,last=0;
 const targets=[new THREE.Vector3(),new THREE.Vector3()];
 const pointerMove=e=>{pointer.x=e.clientX/innerWidth*2-1;pointer.y=e.clientY/innerHeight*2-1};window.addEventListener('pointermove',pointerMove,{passive:true});
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);render(performance.now());}window.addEventListener('resize',resize);
 function render(now){if(disposed)return;const dt=Math.min((now-last)/1000,.05);last=now;if(!reduced)time+=dt;softProgress=reduced?progress:THREE.MathUtils.lerp(softProgress,progress,1-Math.exp(-dt*7));const p=softProgress;const narrow=innerWidth<760;
 const explode=smooth(.13,.38,p);const leave=smooth(.35,.52,p);const displays=smooth(.39,.54,p)*(1-smooth(.73,.84,p));const ending=smooth(.75,.91,p);
 igloo.visible=p<.57;terrain.visible=p<.65;objects.visible=displays>.005;constellation.visible=ending>.01;
 igloo.position.set(explode*(narrow?1.2:2.5),-leave*5,narrow?-.6:0);igloo.scale.setScalar(1-leave*.3);igloo.rotation.y=-.2+explode*.5;
 blocks.forEach((b,i)=>{const seed=b.userData.seed;const home=b.userData.home;const dir=b.userData.direction;b.position.copy(home);b.position.x+=dir.x*explode*(1.6+seed);b.position.y+=explode*(.6+seed*2.5);b.position.z+=dir.z*explode*(1.6+seed);b.rotation.x=b.userData.rot.x+explode*(seed-.5)*.55;b.rotation.z=b.userData.rot.z+explode*(hash(i,4)-.5)*.7;});
 entrance.position.z=2.35+explode*.8;entrance.position.y=explode*.25;inner.visible=explode<.5;core.scale.setScalar(1+explode*.8);core.rotation.y=time*.25;
 const viewH=2*(narrow?15:14)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
 cubes.forEach(({group,symbol},i)=>{const o=cubeOffsets[i];const near=1-smooth(.6,1.15,Math.abs(o));group.visible=near>.001;group.scale.setScalar(Math.max(.001,displays)*(narrow?.95:1.45)*(.8+.2*near));group.position.set(narrow?0:2.3,(narrow?3.9:2.35)-o*viewH*.9+Math.sin(time*.6+i)*.1,0);group.rotation.set(.2+Math.sin(time*.12+i)*.05,-.55+o*.9+Math.sin(time*.18+i)*.1,.05);symbol.rotation.y=time*.15;const scale=hovered===i?1.12:1;symbol.scale.lerp(new THREE.Vector3(scale,scale,scale),.07);});
 constellation.scale.setScalar(Math.max(.001,ending));constellation.position.x=narrow?1.2:3.3;constellation.rotation.y=time*.07;constellation.rotation.z=.25;
 const cameraHome=narrow?new THREE.Vector3(5.3,3.5,12.8):new THREE.Vector3(6.4,3.8,11.5);const cameraGallery=new THREE.Vector3(0,3.6,narrow?15:14);const camT=smooth(.30,.54,p);targets[0].copy(cameraHome).lerp(cameraGallery,camT);targets[0].x+=(reduced?0:pointer.x*.22);targets[0].y+=(reduced?0:-pointer.y*.13);camera.position.copy(targets[0]);targets[1].set(narrow?1.1:.15,1.25,0).lerp(new THREE.Vector3(0,2.35,0),camT);camera.lookAt(targets[1]);
 scene.fog.density=.024+smooth(.35,.57,p)*.018;scene.background.set('#a6afbd').lerp(new THREE.Color('#76879e'),smooth(.4,.58,p)).lerp(new THREE.Color('#63788f'),ending);scene.fog.color.copy(scene.background);
 if(!reduced){const pos=particlesGeo.attributes.position;for(let i=0;i<count;i++){pos.array[i*3]+=.035*dt;pos.array[i*3+1]-=(.14+hash(i,6)*.12)*dt;if(pos.array[i*3+1]<0)pos.array[i*3+1]=13;if(pos.array[i*3]>18)pos.array[i*3]=-18;}pos.needsUpdate=true;}
 renderer.render(scene,camera);container.dataset.ready='true';}
 function loop(now){if(disposed)return;if(!document.hidden&&now-last>(lowPower?65:30))render(now);raf=requestAnimationFrame(loop);}
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);onFail(new Error('Graphics context lost'));});
 render(performance.now());raf=requestAnimationFrame(loop);onReady();
 return {setProgress(value){progress=clamp(value)},setReduced(value){reduced=value},setHovered(index){hovered=index},setCubeOffsets(values){cubeOffsets=values},dispose(){disposed=true;cancelAnimationFrame(raf);window.removeEventListener('pointermove',pointerMove);window.removeEventListener('resize',resize);scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});frost.dispose();particleMat.map.dispose();envTarget?.dispose();renderer.dispose();}};
}
