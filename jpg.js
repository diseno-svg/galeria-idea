/* Galería IDEA · fotos HEIC → JPG al descargar
 * Los iPhone guardan las fotos en HEIC y en Android no se ven. Al descargar, si la foto es HEIC,
 * se convierte aquí mismo a JPG (calidad 92 %) antes de entregarla. Lo demás pasa igual.
 */
(function(){
  'use strict';
  var LIB='lib/heic2any.min.js', cargando=null;
  function esHeic(nombre,tipo,bytes){
    if(/\.(heic|heif)$/i.test(nombre||'')||/image\/hei[cf]/i.test(tipo||''))return true;
    if(bytes&&bytes.length>=12){
      var s=String.fromCharCode.apply(null,bytes.subarray(4,12));
      return /^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(s);
    }
    return false;
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
  // Recibe un File (o Blob + nombre) y devuelve una promesa con el archivo listo para guardar.
  function aJPG(archivo,nombre){
    nombre=nombre||archivo.name||'foto';
    return archivo.slice(0,16).arrayBuffer().then(function(b){
      if(!esHeic(nombre,archivo.type,new Uint8Array(b)))return archivo instanceof File?archivo:new File([archivo],nombre,{type:archivo.type});
      if(window.toast)try{toast('Convirtiendo a JPG…');}catch(e){}
      return lib().then(function(h){return h({blob:archivo,toType:'image/jpeg',quality:0.92});}).then(function(r){
        var b=Array.isArray(r)?r[0]:r;
        return new File([b],String(nombre).replace(/\.(heic|heif)$/i,'')+'.jpg',{type:'image/jpeg'});
      });
    });
  }
  // Videos del iPhone (.MOV): se entregan como .mp4 para que Android los reconozca en la galería del teléfono.
  // No se vuelve a codificar el video (sería muy pesado en el teléfono): solo cambia el envoltorio de nombre y tipo.
  function esMov(nombre,tipo){return /\.(mov|qt)$/i.test(nombre||'')||/video\/quicktime/i.test(tipo||'');}
  function aCompatible(archivo,nombre){
    nombre=nombre||archivo.name||'archivo';
    if(esMov(nombre,archivo.type))
      return Promise.resolve(new File([archivo],String(nombre).replace(/\.(mov|qt)$/i,'')+'.mp4',{type:'video/mp4'}));
    if(/^video\//.test(archivo.type||''))return Promise.resolve(archivo instanceof File?archivo:new File([archivo],nombre,{type:archivo.type}));
    return aJPG(archivo,nombre);
  }
  window.GaleriaJPG={aJPG:aJPG,aCompatible:aCompatible,esHeic:esHeic,esMov:esMov};
})();
