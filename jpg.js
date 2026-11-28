/* Galería IDEA · descarga compatible: TODA foto → .jpg y videos .MOV → .mp4
 * - Fotos RAW (.NEF, .CR2, .CR3, .ARW, .DNG, etc.) sin par JPG: se baja el render JPEG de alta resolución de Drive (s3000).
 * - Fotos HEIC/HEIF (iPhone): se convierten a JPG con heic2any (calidad 92 %).
 * - Fotos PNG, WEBP, AVIF, GIF, BMP u otros formatos de imagen: se convierten a JPG en canvas (calidad 92 %).
 * - Fotos que ya son JPEG: se entregan sin recomprimir, con extensión .jpg.
 * - Videos .MOV (iPhone): se entregan como .mp4 para compatibilidad en Android.
 */
(function(){
  'use strict';
  var LIB='lib/heic2any.min.js', cargando=null;
  var RAW_EXT=/\.(nef|cr2|cr3|arw|dng|orf|rw2|raf|pef|srw|raw)$/i;
  var RAW_MIME=/^image\/x-(nikon|canon|sony|adobe|fuji|olympus|panasonic|pentax|dcraw|raw)/i;

  function esRaw(nombre,tipo){
    return RAW_EXT.test(String(nombre||''))||RAW_MIME.test(String(tipo||''));
  }
  function esHeic(nombre,tipo,bytes){
    if(/\.(heic|heif)$/i.test(nombre||'')||/image\/hei[cf]/i.test(tipo||''))return true;
    if(bytes&&bytes.length>=12){
      var s=String.fromCharCode.apply(null,bytes.subarray(4,12));
      return /^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(s);
    }
    return false;
  }
  function esJpegBytes(bytes){
    return !!(bytes&&bytes.length>=3&&bytes[0]===0xFF&&bytes[1]===0xD8&&bytes[2]===0xFF);
  }
  function esMov(nombre,tipo){return /\.(mov|qt)$/i.test(nombre||'')||/video\/quicktime/i.test(tipo||'');}
  function esVideo(nombre,tipo){
    return /^video\//.test(tipo||'')||/\.(mp4|mov|qt|m4v|webm|mkv|avi|3gp)$/i.test(nombre||'');
  }
  function nombreJPG(nombre){
    var n=String(nombre||'foto').trim();
    if(/\.[a-z0-9]{2,5}$/i.test(n))return n.replace(/\.[a-z0-9]{2,5}$/i,'.jpg');
    return n+'.jpg';
  }
  function lib(){
    if(window.heic2any)return Promise.resolve(window.heic2any);
    if(cargando)return cargando;
    cargando=new Promise(function(ok,mal){
      var s=document.createElement('script'); s.src=LIB; s.async=true;
      s.onload=function(){window.heic2any?ok(window.heic2any):mal(new Error('heic2any'));};
      s.onerror=function(){cargando=null;mal(new Error('no carga '+LIB));};
      document.head.appendChild(s);
    });
    return cargando;
  }
  function canvasAJPG(blob,nombreOut){
    return new Promise(function(ok,mal){
      var u=URL.createObjectURL(blob), im=new Image();
      im.onload=function(){
        try{
          var w=im.naturalWidth||im.width, h=im.naturalHeight||im.height;
          if(!w||!h){URL.revokeObjectURL(u);return mal(new Error('dimensiones'));}
          var cv=document.createElement('canvas'); cv.width=w; cv.height=h;
          var cx=cv.getContext('2d');
          cx.fillStyle='#ffffff'; cx.fillRect(0,0,w,h);
          cx.drawImage(im,0,0,w,h);
          URL.revokeObjectURL(u);
          cv.toBlob(function(b){
            if(!b)return mal(new Error('toBlob'));
            ok(new File([b],nombreOut,{type:'image/jpeg'}));
          },'image/jpeg',0.92);
        }catch(e){URL.revokeObjectURL(u);mal(e);}
      };
      im.onerror=function(){URL.revokeObjectURL(u);mal(new Error('decode'));};
      im.src=u;
    });
  }
  // Recibe un File (o Blob + nombre) de imagen y devuelve una promesa con un File .jpg listo para guardar.
  function aJPG(archivo,nombre){
    nombre=nombre||archivo.name||'foto';
    var outName=nombreJPG(nombre);
    return archivo.slice(0,16).arrayBuffer().then(function(b){
      var bytes=new Uint8Array(b);
      if(esHeic(nombre,archivo.type,bytes)){
        if(window.toast)try{toast('Convirtiendo a JPG…');}catch(e){}
        return lib().then(function(h){return h({blob:archivo,toType:'image/jpeg',quality:0.92});}).then(function(r){
          var res=Array.isArray(r)?r[0]:r;
          return new File([res],outName,{type:'image/jpeg'});
        });
      }
      if(esJpegBytes(bytes)){
        if(archivo instanceof File&&archivo.name===outName&&archivo.type==='image/jpeg')return archivo;
        return new File([archivo],outName,{type:'image/jpeg'});
      }
      // PNG, WEBP, AVIF, GIF, BMP u otra imagen decodificable por el navegador → JPG 92 %.
      if(window.toast)try{toast('Convirtiendo a JPG…');}catch(e){}
      return canvasAJPG(archivo,outName).catch(function(){
        return archivo instanceof File?archivo:new File([archivo],nombre,{type:archivo.type||'application/octet-stream'});
      });
    });
  }
  // Para fotos RAW (.NEF, .CR2, .ARW, .DNG...) sin par JPG en Drive: descarga la vista JPEG de alta resolución (s3000).
  function bajarRawComoJPG(driveId,nombre,apiKey,signal){
    var outName=nombreJPG(nombre||('IDEA-'+driveId));
    var opts=signal?{mode:'cors',signal:signal}:{mode:'cors'};
    function traer(url){
      return fetch(url,opts).then(function(r){
        if(!r.ok)throw new Error('HTTP '+r.status);
        var ct=String(r.headers.get('content-type')||'');
        if(ct&&!/^image\//i.test(ct))throw new Error('no-image');
        return r.blob();
      });
    }
    var lh3='https://lh3.googleusercontent.com/d/'+encodeURIComponent(driveId)+'=s3000';
    return traer(lh3).catch(function(){
      if(!apiKey)throw new Error('no-key');
      var metaUrl='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(driveId)+'?fields=thumbnailLink&key='+encodeURIComponent(apiKey);
      return fetch(metaUrl,signal?{signal:signal}:{}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();}).then(function(m){
        if(!m||!m.thumbnailLink)throw new Error('no-thumb');
        return traer(String(m.thumbnailLink).replace(/=s\d+.*$/,'=s3000'));
      });
    }).catch(function(){
      return traer('https://drive.google.com/thumbnail?id='+encodeURIComponent(driveId)+'&sz=w3000');
    }).then(function(blob){
      return aJPG(new File([blob],outName,{type:blob.type||'image/jpeg'}),outName);
    });
  }
  function aCompatible(archivo,nombre){
    nombre=nombre||archivo.name||'archivo';
    if(esMov(nombre,archivo.type))
      return Promise.resolve(new File([archivo],String(nombre).replace(/\.(mov|qt)$/i,'')+'.mp4',{type:'video/mp4'}));
    if(esVideo(nombre,archivo.type))
      return Promise.resolve(archivo instanceof File?archivo:new File([archivo],nombre,{type:archivo.type||'video/mp4'}));
    return aJPG(archivo,nombre);
  }
  window.GaleriaJPG={
    aJPG:aJPG, aCompatible:aCompatible,
    esHeic:esHeic, esMov:esMov, esRaw:esRaw, esVideo:esVideo,
    nombreJPG:nombreJPG, bajarRawComoJPG:bajarRawComoJPG
  };
})();
