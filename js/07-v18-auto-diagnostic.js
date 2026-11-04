
(function(){
function init(){
const panel=document.getElementById('workspaceDiagnosis');if(!panel||document.getElementById('autoDiagnosis'))return;
const title=panel.querySelector('h2');title.textContent='Diagnóstico inteligente';
const manual=document.createElement('details');manual.id='manualDiagnosis';manual.innerHTML='<summary>Diagnóstico manual — escolher o problema</summary>';
const controls=[...panel.children].filter(x=>x!==title);
controls.forEach(x=>manual.appendChild(x));
const box=document.createElement('section');box.id='autoDiagnosis';box.innerHTML='<h3>🔎 Analisar foto e configurações</h3><p>Use a foto da impressão com defeito e as medidas do ERP. O sistema procura padrões visuais e inconsistências geométricas; não interpreta o conteúdo da foto com IA externa.</p><button id="autoRun" type="button">Analisar automaticamente</button><div id="autoResult" role="status" aria-live="polite"></div>';
title.after(box);box.after(manual);
const btn=document.getElementById('autoRun'),out=document.getElementById('autoResult');
const safe=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function number(id){const e=document.querySelector('[data-key="'+id+'"]');return e?Number(e.value):NaN}
function config(){// Extract the currently displayed fields without changing the app state.
 const fields={};document.querySelectorAll('#fields input,#fields select').forEach(el=>{const k=el.dataset.key||el.name||el.id;if(k)fields[k]=el.value});
 return fields;
}
function analyzeImage(img){
 const max=900,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
 const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0,w,h);
 const data=cx.getImageData(0,0,w,h).data;const yellow=new Uint8Array(w*h),dark=new Uint8Array(w*h);
 let minx=w,maxx=0,miny=h,maxy=0,ys=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const i=y*w+x,j=i*4,r=data[j],g=data[j+1],b=data[j+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
 // Bright yellow sticker paper, distinct from white/gray surroundings.
 const isYellow=r>95&&g>75&&b<Math.min(r,g)*.84&&(hi-lo)>42;
 if(isYellow){yellow[i]=1;ys++;minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y)}
 dark[i]=(r+g+b)<330?1:0;
 }
 if(ys<350||ys/(w*h)<.012)return {ok:false,reason:'Não consegui isolar com segurança a área amarela das etiquetas. Use uma foto de frente, bem iluminada, mostrando as três colunas. Para etiquetas brancas, a detecção de colunas ainda não é suportada.'};
 const bw=maxx-minx+1,bh=maxy-miny+1;
 // Determine column centers by yellow coverage across x. Gaps are typically gray/white.
 const bins=[];for(let x=minx;x<=maxx;x++){let ct=0;for(let y=miny;y<=maxy;y++)ct+=yellow[y*w+x];bins.push(ct/bh)}
 const smooth=bins.map((_,i)=>{let a=0,n=0;for(let k=Math.max(0,i-3);k<=Math.min(bins.length-1,i+3);k++){a+=bins[k];n++}return a/n});
 const active=smooth.map(v=>v>.18);const groups=[];let start=-1;
 for(let i=0;i<=active.length;i++){if(i<active.length&&active[i]&&start<0)start=i;if((i===active.length||!active[i])&&start>=0){if(i-start>Math.max(8,bw*.075))groups.push([minx+start,minx+i-1]);start=-1}}
 const columns=groups.length>=2&&groups.length<=5?groups:[];
 const occupancy=[];
 for(const [a,b] of columns){let ink=0,paper=0;for(let y=miny;y<=maxy;y++)for(let x=a;x<=b;x++){const i=y*w+x;if(yellow[i]){paper++;if(dark[i])ink++}}occupancy.push(paper?ink/paper:0)}
 const nonempty=occupancy.filter(v=>v>.006).length;
 return {ok:true,columns:columns.length,occupancy,nonempty,region:[bw,bh],yellowRatio:ys/(w*h),imageWidth:w,imageHeight:h};
}
btn.onclick=async()=>{
 btn.disabled=true;btn.textContent='Analisando…';
 try{
 const f=document.getElementById('photoPrint')?.files?.[0],img=document.getElementById('imgPrint');
 const flds=config(),printer=document.getElementById('printer')?.value;
 const get=(...names)=>{for(const name of names){const v=flds[name];if(v!==undefined&&v!==''&&Number.isFinite(Number(v)))return Number(v)}return NaN};
 // The app's editable controls carry data-key in the original renderer; also fall back to labels.
 const byLabel=(re)=>{for(const el of document.querySelectorAll('#fields .field')){const l=el.querySelector('label')?.textContent||'';if(re.test(l)){const v=Number(el.querySelector('input,select')?.value);if(Number.isFinite(v))return v}}return NaN};
 const sheet=get('sheet'),width=get('width'),columns=get('columns'),gap=get('colGap'),left=get('left'),right=get('right');
 const sh=Number.isFinite(sheet)?sheet:byLabel(/largura.*folha|largura.*mídia/i);
 const ww=Number.isFinite(width)?width:byLabel(/largura.*etiqueta/i);
 const cc=Number.isFinite(columns)?columns:byLabel(/número.*colunas/i);
 const gg=Number.isFinite(gap)?gap:byLabel(/espaçamento.*colunas/i);
 const ll=Number.isFinite(left)?left:byLabel(/espaçamento.*esquerda/i);
 const rr=Number.isFinite(right)?right:byLabel(/espaçamento.*direita/i);
 const issues=[],facts=[];
 if([sh,ww,cc,gg].every(Number.isFinite)){
 const occupied=ww*cc+gg*(cc-1),free=sh-occupied;
 facts.push('Mídia: '+occupied.toFixed(1)+' mm ocupados de '+sh.toFixed(1)+' mm; sobra '+free.toFixed(1)+' mm.');
 if(free<0)issues.push({level:'alto',title:'Dimensões incompatíveis',body:'As etiquetas e os intervalos ultrapassam a largura da folha em '+Math.abs(free).toFixed(1)+' mm. Confira primeiro a largura da mídia, das etiquetas e o intervalo entre colunas.'});
 }
 if([ww,ll,rr].every(Number.isFinite)){
 const usable=ww-ll-rr;facts.push('Área horizontal disponível para o conteúdo: '+usable.toFixed(1)+' mm.');
 if(usable<=0)issues.push({level:'alto',title:'Área de impressão insuficiente',body:'As margens esquerda e direita consomem toda a largura da etiqueta. Revise esses campos antes de imprimir.'});
 else if(usable<ww*.65)issues.push({level:'médio',title:'Margens ocupam grande parte da etiqueta',body:'A área útil é '+usable.toFixed(1)+' mm em uma etiqueta de '+ww.toFixed(1)+' mm. Um código longo pode não caber; teste reduzir a largura das barras ou as margens, um campo por vez.'});
 }
 let photo;
 if(f&&img?.complete&&img.naturalWidth>0){photo=analyzeImage(img);if(photo.ok){
 facts.push('Foto: '+(photo.columns||'nenhuma')+' colunas amarelas separadas detectadas; proporção de pixels escuros por coluna: '+photo.occupancy.map(v=>(v*100).toFixed(1)+'%').join(' / ')+'.');
 if(photo.columns>=2&&photo.nonempty===1)issues.push({level:'médio',title:'Impressão concentrada em uma coluna',body:'Na foto, apenas uma coluna apresentou densidade de pixels escuros acima do limite de detecção. Confirme visualmente se as outras etiquetas estão vazias. Na Argox, investigue driver, linguagem PPLA, largura configurada e calibração antes de alterar margens.'});
 else if(photo.columns>=2&&photo.nonempty>1)facts.push('Há marcas escuras detectáveis em mais de uma coluna; a hipótese de impressão exclusiva na primeira coluna não foi confirmada pela medição.');
 }else facts.push('Foto: '+photo.reason)}
 else facts.push('Foto não anexada ou não carregada. A análise ficou limitada às configurações do ERP.');
 if(!issues.length)issues.push({level:'observação',title:'Nenhuma inconsistência conclusiva detectada',body:'Os testes disponíveis não localizaram uma causa objetiva. Isso não significa que a impressão esteja correta: sobreposição, leitura de código, recuo, orientação e calibração podem exigir inspeção física.'});
 out.innerHTML='<div class="auto-pill">Análise local • '+safe(printer==='argox'?'Argox PPLA':'Elgin BPLB')+'</div>'+issues.map(i=>'<div class="auto-card"><strong>'+safe(i.title)+'</strong><div class="auto-meta">Prioridade: '+safe(i.level)+'</div><div>'+safe(i.body)+'</div></div>').join('')+'<div class="auto-card"><strong>Dados usados</strong><div>'+facts.map(s=>'<p style="margin:5px 0">• '+safe(s)+'</p>').join('')+'</div></div><div class="auto-warning">A imagem é examinada no navegador e não é enviada a um serviço de IA. Detecção de etiquetas amarelas é experimental: reflexos, perspectiva, sombras e texto fino podem alterar o resultado. Nenhuma configuração foi alterada automaticamente. Confira a impressão real antes de decidir.</div>';
 }catch(e){out.textContent='Não foi possível analisar: '+e.message;}
 finally{btn.disabled=false;btn.textContent='Analisar automaticamente';}
};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

