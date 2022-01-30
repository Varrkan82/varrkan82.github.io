(function () {
    'use strict';	

		Lampa.Listener.follow('app',(e)=>{
        if(e.type == 'ready'){
			$("[data-action=anime]").eq(0).remove();
        }
    });

})();