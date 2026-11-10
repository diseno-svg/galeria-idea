(function(){
  'use strict';
  var KEY='AIzaSyDG8OEUiJTqQdNck1NJZhOpD36Q1VBaAyQ';
  var DATOS='https://www.googleapis.com/drive/v3/files/1eURdGqo8-mjYhzMJttVHpCFgzEoa-hd1?alt=media&key='+KEY;
  var PLANB='https://script.google.com/macros/s/AKfycbyrG0n6aA9xGT6MTiMDLYwG3CD0E5ym5JdFAn89d6jcwludo2uJJem0xgO0q3jSEc72/exec?accion=datos';
  var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  function $(id){return document.getElementById(id);}
  function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function ic(n){return '<svg class="ic"><use href="#i-'+n+'"/></svg>';}
  var tt; function toast(m){var t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on');},2600);}

  // Mismo código que genera la galería al tocar «Compartir con alumnos».
  function fnv(s,h){for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
  function codigo(album){var s='idea·alumnos·'+album;return fnv(s,2166136261).toString(36)+fnv(s,3735928559).toString(36);}

  var token=(new URLSearchParams(location.search).get('a')||'').trim().toLowerCase();
  // El código no debe quedar en el historial de otras páginas si se comparte la pantalla.
  var ITEMS=[], POS=0;

  function falla(titulo,txt){
    $('main').innerHTML='<div class="state"><svg class="big ic"><use href="#i-lockk"/></svg><h2>'+esc(titulo)+'</h2><p>'+esc(txt)+'</p></div>';
  }
  if(!/^[a-z0-9]{8,16}$/.test(token)){ falla('Enlace no válido','Pídele a IDEA el enlace completo de tus fotos y videos.'); return; }

  function cargar(url,intento){
    return fetch(url,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
      .then(function(d){if(!d||!d.contenido)throw new Error('vacío');return d;});
  }
  function obtener(){
    return cargar(DATOS).catch(function(){return cargar(PLANB);})
      .catch(function(){return new Promise(function(ok){setTimeout(ok,2500);}).then(function(){return cargar(DATOS);});});
  }

  function titulo(a,r){
    if(a.indexOf('EDITADOS · ')===0)return 'Videos editados · '+a.slice(11);
    var t='';
    var ev=String(r.evento||'').split(' / ')[0].trim(), partes=a.split(/\s+-\s+/), ult=partes[partes.length-1]||'';
    if(ev&&!/^general$/i.test(ev))t=ev;
    else if(partes.length>=4&&ult&&!/^general$/i.test(ult))t=ult;
    else if(/^EVENTOS\s*-/i.test(a)&&partes[1]&&!/^[A-Z]{3}$/.test(partes[1]))t=partes[1];
    else if(r.tipoEvento&&r.tipoEvento!=='Sin especificar')t=r.tipoEvento;
    var svc=String(r.servicio||'').replace(/^\d+_/,'').trim();
    if(!t)t=svc||'Fotos y videos';
    t=String(t).replace(/_/g,' ').replace(/\s+/g,' ').trim();
    return t.charAt(0).toUpperCase()+t.slice(1);
  }
  function fecha(a){var m=String(a).match(/(20\d{2})-(\d{2})-(\d{2})/);return m?(+m[3])+' de '+MESES[+m[2]-1]+' de '+m[1]:'';}

  // Si el álbum se subió hace poco y todavía no está en el catálogo, se busca directo en Drive.
  var vivoProbado=false;
  function buscarVivo(d){
    var sc=document.createElement('script'); sc.src='vivo.js?v='+Date.now();
    sc.onload=function(){ window.GaleriaVivo.cargar().then(function(rows){ procesar({contenido:(d.contenido||[]).concat(rows)}); })
      .catch(function(){ procesar(d); }); };
    sc.onerror=function(){ procesar(d); };
    document.head.appendChild(sc);
  }
  obtener().then(procesar).catch(function(){
    falla('No se pudo cargar','Revisa tu conexión e intenta de nuevo en unos minutos.');
  });
  function procesar(d){
    var porAlbum={};
    (d.contenido||[]).forEach(function(r){
      if(!r||!r.driveId||String(r.driveId).indexOf('gphotos:')===0||!r.album)return;
      if(/listo/i.test(r.estado||'')){var sd=r.sede?String(r.sede).replace(/San Cristobal/i,'San Cristóbal'):'';
        if(!sd){var A=String(r.album||'').toUpperCase(),M={BRM:'Barquisimeto',CCS:'Caracas',MAR:'Maracaibo',PMV:'Margarita',SCI:'San Cristóbal',VLN:'Valencia',CHA:'Charallave'};
          for(var k in M){var nn=M[k].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(A.indexOf(' '+k+' ')>=0||A.indexOf(nn)>=0){sd=M[k];break;}}}
        r.album='EDITADOS · '+(sd||'Sin sede');}
      (porAlbum[r.album]=porAlbum[r.album]||[]).push(r);
    });
    var alb=null;
    Object.keys(porAlbum).some(function(a){if(codigo(a)===token){alb=a;return true;}return false;});
    if(!alb&&!vivoProbado){ vivoProbado=true; return buscarVivo(d); }
    if(!alb){ falla('Enlace no disponible','Este álbum ya no está disponible o el enlace está incompleto. Pídele a IDEA uno nuevo.'); return; }
    // Solo queda en memoria el álbum de este enlace.
    ITEMS=porAlbum[alb]; porAlbum=null; d=null;
    ITEMS.sort(function(x,y){return String(x.nombre||'').localeCompare(String(y.nombre||''),'es',{numeric:true});});
    pintar(alb);
  }

  function pintar(alb){
    var r0=ITEMS[0], t=titulo(alb,r0), f=fecha(alb);
    var nv=ITEMS.filter(function(r){return r.tipo==='Video';}).length, nf=ITEMS.length-nv;
    var svc=String(r0.servicio||'').replace(/^\d+_/,'').trim();
    var meta=[];
    if(svc&&svc.toLowerCase()!==t.toLowerCase())meta.push('<span class="svc">'+esc(svc.toUpperCase())+'</span>');
    if(r0.sede)meta.push('<span>'+esc(r0.sede)+'</span>');
    if(f)meta.push('<span>'+esc(f)+'</span>');
    var cuenta=[]; if(nf)cuenta.push(nf+(nf===1?' foto':' fotos')); if(nv)cuenta.push(nv+(nv===1?' video':' videos'));
    document.title=t+' · IDEA';
    var h='<section class="head"><div class="kick">Tus fotos y videos</div><h1>'+esc(t)+'</h1>'+
      (meta.length?'<div class="meta">'+meta.join('')+'</div>':'')+
      '<p class="hint">'+esc(cuenta.join(' · '))+' · Toca una para verla y descargarla</p></section><div class="grid" id="grid">';
    ITEMS.forEach(function(r,i){
      h+='<div class="card" data-i="'+i+'" style="--i:'+Math.min(i,30)+'"><img alt="" loading="lazy" data-src="https://drive.google.com/thumbnail?id='+encodeURIComponent(r.driveId)+'&sz=w400">'+
        (r.tipo==='Video'?'<span class="vb">'+ic('play')+'Video</span>':'')+
        '<button class="dl" data-dl="'+i+'" aria-label="Descargar">'+ic('dl')+'</button></div>';
    });
    h+='</div><footer>IDEA Aviation Corporation · Instituto de Especialidades Aeronáuticas</footer>';
    $('main').innerHTML=h;
    [].forEach.call(document.querySelectorAll('.card img'),function(im){
      im.onload=function(){im.classList.add('in');}; im.onerror=function(){im.style.display='none';};
      im.src=im.getAttribute('data-src');
    });
  }

  // Descarga directa: se baja el archivo aquí mismo (con la dirección de la galería, que es la que Google acepta)
  // y se entrega como archivo. En el teléfono se abre «Guardar imagen / Guardar video» para que quede en Fotos.
  var MIME={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',heic:'image/heic',heif:'image/heif',webp:'image/webp',
    mp4:'video/mp4',mov:'video/quicktime',m4v:'video/mp4'};
  var MOVIL=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var bajando=false, LISTO=null;
  function entregar(file){
    if(MOVIL&&navigator.canShare&&navigator.share){
      try{ if(navigator.canShare({files:[file]})){
        return navigator.share({files:[file]}).then(function(){LISTO=null;$('lsheet').classList.remove('on');},function(e){
          // Si el teléfono pide otro toque (tardó en bajar), se muestra el botón «Guardar».
          if(e&&e.name==='AbortError'){LISTO=null;$('lsheet').classList.remove('on');return;}
          LISTO=file; $('lsname').textContent=file.name; $('lsheet').classList.add('on');
        });
      } }catch(e){}
    }
    var u=URL.createObjectURL(file), a=document.createElement('a');
    a.href=u; a.download=file.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(u);},60000);
    LISTO=null; $('lsheet').classList.remove('on'); toast('Listo · revisa tus descargas');
  }
  // Fotos ya bajadas por detrás (al abrirlas en el visor), para guardarlas con un solo toque.
  var LISTAS={};
  function bajar(r){
    var url='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(r.driveId)+'?alt=media&key='+KEY;
    return fetch(url,{referrerPolicy:'strict-origin-when-cross-origin'}).then(function(res){if(!res.ok)throw new Error(res.status);return res.blob();});
  }
  function archivo(r,blob){
    var nombre=r.nombre||('IDEA-'+r.driveId), ext=(nombre.split('.').pop()||'').toLowerCase();
    return new File([blob],nombre,{type:MIME[ext]||blob.type||'application/octet-stream'});
  }
  function precargar(i){
    var r=ITEMS[i]; if(!r||r.tipo==='Video'||LISTAS[r.driveId])return;
    LISTAS[r.driveId]=bajar(r).then(function(b){var f=archivo(r,b);LISTAS[r.driveId].listo=f;return f;},function(){delete LISTAS[r.driveId];return null;});
  }
  function descargar(i){
    var r=ITEMS[i]; if(!r||bajando)return;
    var pre=LISTAS[r.driveId];
    if(pre&&pre.listo){ entregar(pre.listo); return; }
    bajando=true; toast('Descargando…');
    var nombre=r.nombre||('IDEA-'+r.driveId), ext=(nombre.split('.').pop()||'').toLowerCase();
    var url='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(r.driveId)+'?alt=media&key='+KEY;
    fetch(url,{referrerPolicy:'strict-origin-when-cross-origin'}).then(function(res){
      if(!res.ok)throw new Error(res.status);
      var total=+res.headers.get('content-length')||0;
      if(!res.body||!res.body.getReader||!total)return res.blob();
      var rd=res.body.getReader(), partes=[], n=0, ult=0;
      function leer(){return rd.read().then(function(x){
        if(x.done)return new Blob(partes);
        partes.push(x.value); n+=x.value.length;
        var pc=Math.floor(n*100/total); if(pc-ult>=5){ult=pc;toast('Descargando… '+pc+'%');}
        return leer();
      });}
      return leer();
    }).then(function(blob){
      var file=new File([blob],nombre,{type:MIME[ext]||blob.type||'application/octet-stream'});
      return entregar(file);
    }).catch(function(){
      toast('No se pudo descargar. Revisa tu conexión e intenta de nuevo.');
    }).then(function(){bajando=false;});
  }

  function ver(i){
    POS=(i+ITEMS.length)%ITEMS.length; var r=ITEMS[POS], s=$('lbs'), id=encodeURIComponent(r.driveId);
    $('lbn').textContent=(POS+1)+' de '+ITEMS.length;
    precargar(POS);
    var nav='<button class="ib nav p" id="lbp" aria-label="Anterior">'+ic('l')+'</button><button class="ib nav n" id="lbnx" aria-label="Siguiente">'+ic('r')+'</button>';
    if(r.tipo==='Video'){
      // Reproductor de Drive encerrado: sin ventanas nuevas ni salida a Drive.
      s.innerHTML=nav+'<div class="fr"><iframe sandbox="allow-scripts allow-same-origin" allow="autoplay; fullscreen" allowfullscreen referrerpolicy="no-referrer" src="https://drive.google.com/file/d/'+id+'/preview"></iframe><div class="cap"></div></div>';
    } else {
      s.innerHTML=nav+'<img alt="" src="https://drive.google.com/thumbnail?id='+id+'&sz=w1600">';
    }
    $('lbp').onclick=function(){ver(POS-1);}; $('lbnx').onclick=function(){ver(POS+1);};
  }
  function abrir(i){ver(i);$('lb').classList.add('on');document.body.classList.add('noscroll');}
  function cerrar(){$('lb').classList.remove('on');$('lbs').innerHTML='';document.body.classList.remove('noscroll');}

  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-dl]'); if(t){e.stopPropagation();descargar(+t.getAttribute('data-dl'));return;}
    t=e.target.closest('.card'); if(t){abrir(+t.getAttribute('data-i'));}
  });
  $('lsgo').onclick=function(){if(LISTO)entregar(LISTO);};
  $('lsx').onclick=function(){LISTO=null;$('lsheet').classList.remove('on');};
  $('lbx').onclick=cerrar; $('lbdl').onclick=function(){descargar(POS);};
  document.addEventListener('keydown',function(e){
    if(!$('lb').classList.contains('on'))return;
    if(e.key==='Escape')cerrar(); else if(e.key==='ArrowLeft')ver(POS-1); else if(e.key==='ArrowRight')ver(POS+1);
  });
  // Deslizar en el teléfono
  var x0=null;
  $('lbs').addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
  $('lbs').addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50)ver(POS+(dx<0?1:-1));},{passive:true});
  document.addEventListener('contextmenu',function(e){if(e.target.closest('.lb-stage'))e.preventDefault();});
})();
