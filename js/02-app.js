
// OCR client-side, only for screenshots of the ERP. Never silently change configuration.
(function(){
const $=id=>document.getElementById(id);
const labels=[
 ['sheet','Largura da folha'],['columns','Número de colunas'],['colGap','Espaçamento entre colunas'],['rowGap','Espaçamento entre linhas'],
 ['width','Largura da etiqueta'],['height','Altura da etiqueta'],['top','Espaçamento superior'],['bottom','Espaçamento inferior'],['left','Espaçamento da esquerda'],['right','Espaçamento da direita'],
 ['sectionWidth','Largura da seção'],['sectionLeft','Espaçamento da esquerda da seção'],['recuo','Recuo da etiqueta'],
 ['barHeight','Altura do código'],['barBottom','Espaçamento inferior do código'],['barLeft','Espaçamento da esquerda do código'],
 ['nameFont','Tipo da fonte do produto'],['nameSize','Tamanho da fonte do produto'],['nameLines','Espaçamento entre linhas do produto'],['nameBottom','Espaçamento inferior do produto'],['nameLeft','Espaçamento da esquerda do produto'],
 ['priceFont','Tipo da fonte do preço'],['priceSize','Tamanho da fonte do preço'],['priceLines','Espaçamento entre linhas do preço'],['priceBottom','Espaçamento inferior do preço'],['priceLeft','Espaçamento da esquerda do preço']
];
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const parseNumber=s=>{const m=String(s).replace(/[,]/g,'.').match(/(?:^|\s)(-?\d{1,4}(?:\.\d{1,2})?)(?:\s|$)/);return m?Number(m[1]):null};
function extract(lines){
 // OCR text is grouped by ERP section and line to avoid mixing repeated labels.
 let section='geral', sub=''; const out={}, evidence={};
 const headers=[['barcode',/linha\s*1|codigo de barras/],['produto',/linha\s*2/],['preco',/linha\s*3/],['secao',/secoes da etiqueta|secao 1/],['dim',/etiqueta dimensoes/],['col',/colunas da folha/],['folha',/^folha$/],['imp',/configuracoes da impressora/]];
 for(let i=0;i<lines.length;i++){
  let raw=lines[i],t=norm(raw); if(!t)continue;
  if(/linha 1/.test(t))section='barcode';else if(/linha 2/.test(t))section='produto';else if(/linha 3/.test(t))section='preco';
  else if(/secoes da etiqueta/.test(t))section='secao';else if(/etiqueta dimensoes/.test(t))section='dim';else if(/colunas da folha/.test(t))section='col';else if(/^folha$/.test(t))section='folha';else if(/configuracoes da impressora/.test(t))section='imp';
  // Scan labels and nearby values, preserving their sequence; multiple column layouts may be ambiguous.
  for(const [key,label] of labels){
   const target=norm(label); if(!t.includes(target))continue;
   const allowed={sheet:['folha'],columns:['col'],colGap:['col'],rowGap:['col'],width:['dim'],height:['dim'],top:['dim'],bottom:['dim'],left:['dim'],right:['dim'],sectionWidth:['secao'],sectionLeft:['secao'],recuo:['imp'],barHeight:['barcode'],barBottom:['barcode'],barLeft:['barcode'],nameFont:['produto'],nameSize:['produto'],nameLines:['produto'],nameBottom:['produto'],nameLeft:['produto'],priceFont:['preco'],priceSize:['preco'],priceLines:['preco'],priceBottom:['preco'],priceLeft:['preco']}[key]||[];
   if(!allowed.includes(section))continue;
   // Only take numbers on same OCR line after label; don't guess distant fields.
   const tail=norm(raw.slice(raw.toLowerCase().indexOf(label.toLowerCase())+label.length));
   const val=parseNumber(tail);if(val!==null && Number.isFinite(val)&&val>=0&&val<=500){out[key]=val;evidence[key]=raw.trim()}
  }
 }
 return {out,evidence};
}
function loadScript(url){return new Promise((resolve,reject)=>{let s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(Error('Não foi possível carregar o OCR. Verifique sua conexão.'));document.head.appendChild(s)})}
$('readERP').onclick=async()=>{
 const f=$('photoERP').files[0],status=$('ocrStatus'),review=$('ocrReview');review.innerHTML='';
 if(!f){status.textContent='Anexe primeiro uma captura do ERP no campo “Captura do ERP”.';return}
 try{
  status.textContent='Carregando o leitor OCR...';
  if(!window.Tesseract)await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
  status.textContent='Lendo a imagem... Pode levar alguns segundos.';
  const result=await window.Tesseract.recognize(f,'por+eng',{logger:m=>{if(m.status==='recognizing text')status.textContent='Reconhecendo texto: '+Math.round((m.progress||0)*100)+'%'}});
  const raw=result.data.text||'';const {out,evidence}=extract(raw.split(/\n/));
  const keys=Object.keys(out);status.textContent=keys.length?keys.length+' campo(s) candidato(s) encontrado(s). Revise antes de aplicar.':'OCR concluído, mas não foi possível associar valores com segurança. Use a transcrição abaixo para preencher manualmente.';
  const intro=document.createElement('p');intro.className='subtle';intro.textContent='A leitura de capturas com campos em colunas pode associar valores incorretos. Marque somente os valores que conferiu.';review.appendChild(intro);
  for(const key of keys){let wrap=document.createElement('div');wrap.className='field';wrap.style.marginBottom='8px';let lab=document.createElement('label');let check=document.createElement('input');check.type='checkbox';check.style.width='auto';check.dataset.ocrKey=key;lab.append(check,' '+(labels.find(x=>x[0]===key)||[key,key])[1]+' — conferir valor');let inp=document.createElement('input');inp.type='number';inp.step='0.1';inp.value=out[key];inp.dataset.ocrValue=key;let small=document.createElement('small');small.textContent='Trecho lido: '+evidence[key];wrap.append(lab,inp,small);review.appendChild(wrap)}
  if(keys.length){let btn=document.createElement('button');btn.className='btn';btn.textContent='Aplicar apenas campos conferidos';btn.onclick=()=>{const checked=[...review.querySelectorAll('[data-ocr-key]:checked')];if(!checked.length){status.textContent='Marque ao menos um campo conferido.';return}checkpoint();for(const ch of checked){const key=ch.dataset.ocrKey;const val=Number(review.querySelector('[data-ocr-value="'+key+'"]').value);if(Number.isFinite(val)&&val>=0&&val<=500)cfg[key]=val}savedByPrinter[printer]={...cfg};renderLineEditor();renderFields();renderPreview();status.textContent=checked.length+' campo(s) conferido(s) aplicado(s). Faça um teste de impressão.'};review.appendChild(btn)}
  let details=document.createElement('details');let summary=document.createElement('summary');summary.textContent='Ver texto bruto reconhecido';let pre=document.createElement('pre');pre.style='white-space:pre-wrap;max-height:260px;overflow:auto;font-size:11px';pre.textContent=raw;details.append(summary,pre);review.appendChild(details);
 }catch(e){status.textContent='Falha na leitura: '+e.message+'. Você pode continuar preenchendo manualmente.'}
};
})();

