
(function(){
const host=document.querySelector('#preview').closest('.panel');
const tool=document.createElement('div');tool.innerHTML=`<h3 style="margin:16px 0 6px;color:#08447b">Comparação da impressão real com a prévia</h3><p class="subtle">Uma única prévia, baseada nos campos atuais do ERP. Compare com a foto real. A simulação é aproximada e não substitui o teste impresso.</p><div class="mode-simple"><label for="v5mode">Visualização</label><select id="v5mode"><option value="both">Foto real e simulação lado a lado</option><option value="photo">Somente foto real</option><option value="simulation">Somente simulação</option></select></div><details class="compare-advanced"><summary>⚙ Ajustes avançados de visualização</summary><div class="compare-toolbar"><div><label>Deslocamento horizontal (mm)</label><input id="v5dx" type="number" step="0.5" value="0"></div><div><label>Deslocamento vertical (mm)</label><input id="v5dy" type="number" step="0.5" value="0"></div><div><label>Escala visual</label><select id="v5scale"><option value="5">Compacta</option><option value="7" selected>Normal</option><option value="9">Ampliada</option></select></div><div><label>Colunas preenchidas</label><select id="v5fill"><option value="all">Todas (impressão esperada)</option><option value="first">Somente primeira (teste)</option></select></div><div><label>Repetir por coluna</label><select id="v5repeat"><option value="yes">Sim</option><option value="no">Não (posição absoluta)</option></select></div></div><div class="compare-actions"><button class="cmpbtn" id="v5reset" type="button">Zerar deslocamentos</button><button class="cmpbtn" id="v5apply" type="button">Usar margens atuais</button></div></details><div id="v5output"></div><div id="v5alerts" aria-live="polite"></div>`;
host.insertBefore(tool,document.querySelector('#preview'));
// A prévia antiga continua calculando internamente, mas não aparece mais ao usuário.
const oldPreview=document.querySelector('#preview');oldPreview.hidden=true;oldPreview.style.display='none';
const oldLegend=host.querySelector('.legend');if(oldLegend)oldLegend.style.display='none';
const oldGeometry=document.querySelector('#geometry');if(oldGeometry)oldGeometry.style.display='none';
const oldMeasure=document.querySelector('#measureAlerts');if(oldMeasure){const d=oldMeasure.closest('details');if(d)d.style.display='none';}
const previewTitle=document.querySelector('#previewTitle');if(previewTitle)previewTitle.textContent='Prévia única • Foto real e simulação';
const $=id=>document.getElementById(id), esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function paint(){
 const c=cfg, elgin=printer==='elgin', w=Number(c.width)||32,h=Number(c.height)||21,gap=Number(c.colGap)||0,count=Math.min(5,Math.max(1,Number(c.columns)||3));
 const dx=Number($('v5dx').value)||0,dy=Number($('v5dy').value)||0;
 const stageWidth=Math.max(290,document.querySelector('#v5output')?.clientWidth||720);
 const split=$('v5mode').value==='both';
 const target=split?Math.max(180,(stageWidth-32)/2):stageWidth-24;
 const nominal=Number($('v5scale').value)||7;
 const paperW=Math.max(Number(c.sheet)||0,count*w+(count-1)*gap);
 const unit=Math.min(nominal,Math.max(1.2,(target-18)/paperW));
 const scale=elgin?1:1.05;
 const code=String($('sampleCode').value),name=String($('sampleName').value),price=String($('samplePrice').value);
 const span=w+gap, dxv=dx, dyv=dy;
 const text=(cls,value,x,y,size,width,height,extra='')=>`<div class="compare-content ${cls}" style="left:${x*unit}px;top:${y*unit}px;width:${Math.max(1,width)*unit}px;height:${height*unit}px;font-size:${size*unit}px;line-height:1.08;overflow:visible;white-space:pre-wrap;${extra}">${esc(value)}</div>`;
 const lines=Array.isArray(c.lines)&&c.lines.length?c.lines:['barcode','produto','preco'];
 let issues=[],parts=[];
 for(let i=0;i<count;i++){
  const origin=i*span,shift=$('v5repeat').value==='yes'?origin:0;
  parts.push(`<div class="compare-cell" style="left:${origin*unit}px;top:0;width:${w*unit}px;height:${h*unit}px;overflow:hidden"></div>`);
  if($('v5fill').value==='first'&&i>0)continue;
  let y=Number(c.top||0)+dyv+0.5;
  for(const type of lines){
   if(type==='barcode'){
    const x=shift+Number(c.left||0)+Number(c.barLeft||0)+dxv;
    const bh=Math.max(0.5,Number(c.barHeight)||3);
    const thick=Math.max(0,Number(c.thick??1)),thin=Math.max(0,Number(c.thin??1));
    const symbolFactor=({EAN13:95,EAN8:67,C39:code.length*13,C128:code.length*9})[c.barcodeType]||code.length*9;
    const bw=Math.max(4,symbolFactor*(thin*.10+thick*.045));
    const pattern=Array.from({length:Math.max(25,Math.min(100,Math.floor(symbolFactor/2)))},(_,j)=>`<i style="display:block;height:100%;width:${(j%4===0?Math.max(0.5,thick):Math.max(0.5,thin))*.27*unit}px;background:${j%3===1?'transparent':'#111'};flex:none"></i>`).join('');
    parts.push(`<div class="compare-content" style="position:absolute;left:${x*unit}px;top:${y*unit}px;width:${bw*unit}px;height:${bh*unit}px;display:flex;overflow:hidden">${pattern}</div>`);
    if(c.showCode==='Sim')parts.push(text('compare-code',code,x,y+bh,1.6,bw,1.8,'font-weight:600;white-space:nowrap;'));
    if(x<origin||x+bw>origin+w)issues.push('Código de barras pode ultrapassar a largura da etiqueta.');
    y+=bh+(c.showCode==='Sim'?1.8:0)+Math.max(0,Number(c.barBottom)||0)*.35;
   }else if(type==='produto'||type==='preco'){
    const isName=type==='produto',font=Number(isName?c.nameSize:c.priceSize)||1;
    const fs=(isName?1.65:2.0)*font*(elgin?1:1.03);
    const x=shift+Number(c.left||0)+Number(isName?c.nameLeft:c.priceLeft||0)+dxv;
    const val=isName?name:price;
    const available=Math.max(4,w-(x-origin)-Number(c.right||0));
    const wrap=Number(isName?c.nameWrap:c.priceWrap)||0;
    const maxChars=wrap||Math.max(5,Math.floor(available/(fs*.52)));
    const chunks=[];let row='';for(const word of val.split(/\s+/)){if(row&&(row+' '+word).length>maxChars){chunks.push(row);row=word}else row=(row+' '+word).trim()}if(row)chunks.push(row);
    const content=chunks.slice(0,6).join('\n'),lineSpacing=Number(isName?c.nameLines:c.priceLines)||1;
    const lineH=fs*(1+Math.min(12,lineSpacing)*.045),hh=chunks.slice(0,6).length*lineH;
    parts.push(text(isName?'compare-name':'compare-price',content,x,y,fs,available,hh,isName?'':'font-weight:900;'));
    if(x<origin||x+available>origin+w+1)issues.push('Texto pode ultrapassar a borda horizontal.');
    y+=hh+Math.max(0,Number(isName?c.nameBottom:c.priceBottom)||0)*.35;
   }else{y+=2.5}
  }
  if(y>h+.5)issues.push('Conteúdo pode ultrapassar a altura da etiqueta.');
 }
 const simulated=`<div class="compare-stage" style="overflow-x:hidden;padding:8px"><div class="compare-sheet" style="width:${paperW*unit}px;height:${h*unit}px">${parts.join('')}</div></div>`;
 const photo='';
 const mode=$('v5mode').value;
 const existingPhoto=document.getElementById('workspacePhoto');if(existingPhoto)tool.appendChild(existingPhoto);
 $('v5output').innerHTML=mode==='both'?`<div class="compare-split"><div><h3>Foto real (com problema)</h3><div id="v15photoSlot"></div>${photo}</div><div><h3>Simulação calibrada</h3>${simulated}</div></div>`:mode==='photo'?`<div id="v15photoSlot"></div>${photo}`:simulated;
 const slot=document.getElementById('v15photoSlot');const photoBox=document.getElementById('workspacePhoto');if(slot&&photoBox)slot.appendChild(photoBox);
 const unique=[...new Set(issues.map(t=>t.replace(/Coluna \d+: /,'Em uma ou mais etiquetas: ')))];
 $('v5alerts').innerHTML=(unique.length?unique.slice(0,2).map(t=>`<div class="compare-notice">⚠ ${esc(t.replace(/Coluna \d+: /,'Em uma ou mais etiquetas: '))}</div>`).join(''):'<div class="compare-ok">Nenhum corte evidente na estimativa. Confira sempre a impressão real.</div>')+
 `<p class="subtle">Impressora selecionada: ${elgin?'Elgin BPLB':'Argox PPLA'}: proporções ilustrativas ajustadas para visualização. Barras não são um código válido e alertas não comprovam falha física. Escala automática: ${unit.toFixed(2)} px/mm.</p>`;
}
['v5mode','v5dx','v5dy','v5scale','v5fill','v5repeat'].forEach(id=>$(id).addEventListener('input',paint));
$('v5reset').onclick=()=>{$('v5dx').value=0;$('v5dy').value=0;paint()};
$('v5apply').onclick=()=>{$('v5dx').value=0;$('v5dy').value=0;paint()};
const original=renderPreview;renderPreview=function(){original();paint()};
window.addEventListener('resize',paint);
$('photoPrint').addEventListener('change',()=>setTimeout(paint,250));
paint();
})();

