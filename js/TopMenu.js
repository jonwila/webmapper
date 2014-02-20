function TopMenu(container, model)
{
	this._container = container;
	this.model = model;
	
	this.connectionModesDisplayOrder = ["Byp", "Rev", "Line", "Calib", "Expr"];
	
	this.connectionModeCommands = {"Byp": 'bypass',
			 "Rev": 'reverse',
			 "Line": 'linear',
			 "Calib": 'calibrate',
			 "Expr": 'expression'};

	this.connectionModes = ["None", "Byp", "Line", "Expr", "Calib", "Rev"];

	this.boundaryModes = ["None", "Mute", "Clamp", "Fold", "Wrap"];
	
	this.boundaryIcons = ["boundaryNone", "boundaryUp", "boundaryDown",
	                     "boundaryMute", "boundaryClamp", "boundaryWrap"];
}

TopMenu.prototype = {
		
		/**
		 * Initialize the Top Menu Bar Component
		 */
		init : function () 
		{ 
			var _self = this;				// to pass to context of THIS to event handlers
			
			$(this._container).empty();		// clear the container DIV
			
			
			
			window.saveLocation = '';		// Where the network will be saved
			
			$(this._container).append(
			        "<div class='topMenu'>"+
			        "<div class='utils'>"+
			        	"<div id='refresh'></div>"+
			        	"<div id='saveLoadDiv'>"+
					        "<div id='loadButton'><input type='file' id='fileinput' name='files[]' multiple /></div>"+
					        "<div><a id='saveButton'>Save</a></div>"+
					    "</div>"+
				        "<div>Display: <select id='modeSelection'>"+
					        "<option value='list' selected>List</option>"+
					        "<option value='grid'>Grid</option>"+
					        "<option value='hive'>Hive</option>"+
					        "<option value='balloon'>Balloon</option></select>"+
				        "</div>"+
			        "</div>"+
			    "</div>"
		    );

			this.checkBrowserSupport();
			
		    //Add the mode controls
		    $('.topMenu').append("<div class='signalProps'>"+
		    		 	"<div class='modesDiv signalControl disabled'>Mode: </div>"+
		    		 	"<div class='ranges' style='width:50%'></div>"+
		    		 "</div>");
		    
		    for (var m in this.connectionModesDisplayOrder) {
		        $('.modesDiv').append(
		            "<div class='mode mode"+this.connectionModesDisplayOrder[m]+"'>"+this.connectionModesDisplayOrder[m]+"</div>");
		    }

		    $('.modesDiv').append("<div style='width:100%'>Expression: "+
		    		 	"<input type='text' id='expression 'class='expression' style='width:calc(100% - 90px)'></input>"+
		    		 "</div>");

		    //Add the range controls
		    $('.ranges').append(
		    		 "<div id='srcRange' class='range signalControl disabled'>Src Range: </div>"+
		    		 "<div id='destRange' class='range signalControl disabled'>Dest Range:</div>");
					 
		    $('.range').append("<input style='width:calc(50% - 60px)'><input>");
		    $('.range').children('input').each( function(i) {
		    	var minOrMax = 'max';   // A variable storing minimum or maximum
		    	var srcOrDest = 'src_';
		    	if(i%2==0)  minOrMax = 'min';
		    	if(i>1)     srcOrDest = 'dest_';
		        $(this).attr({
		            'maxLength': 25,
		            "size": 30,
		            // Previously this was stored as 'rangeMin' or 'rangeMax'
		            'class': 'range',   
		            'id': srcOrDest+minOrMax
		        });
		    });
		    
		    $("<input id='boundaryMin' class='boundary boundaryDown' type='button'></input>").insertBefore('#dest_min');
		    $("<input id='boundaryMax' class='boundary boundaryUp' type='button'></input>").insertAfter('#dest_max');
		    $("<input id='foo' class='boundary' type='button'></input>").insertBefore('#src_min');
		    $("<input id='bar' class='boundary' type='button'></input>").insertAfter('#src_max');
		    
		    // extra tools
		    $('.topMenu').append(
		    	"<div id='wsstatus' class='extratools'>websocket uninitialized</div>");
		    
		    this.addHandlers();
		},
		
		addHandlers : function ()
		{
			var _self = this;
			
			//The expression and range input handlers
		    $('.topMenu').on({
		        keydown: function(e) {
		            e.stopPropagation();
		            if(e.which == 13){ //'enter' key
		            	_self.selected_connection_set_input( $(this).attr('id').split(' ')[0], this );
		            }
		        },
		        click: function(e) { e.stopPropagation(); },
		        blur: function() {_self.selected_connection_set_input( $(this).attr('id').split(' ')[0], this );}
		    }, 'input');
			
		    //For the mode buttons
		    $('.topMenu').on("click", '.mode', function(e) {
		        e.stopPropagation();
		        _self.selected_connection_set_mode(e.currentTarget.innerHTML);
		    });

		    //For the visualization mode selection menu
		    $('#modeSelection').change( function(e) {
		        var newMode = $('#modeSelection').val();
		        $(_self._container).trigger("switchView", [newMode]);	// trigger switch event
		    });

		    $('#saveButton').on('click', function(e) {
		        e.stopPropagation();
		    });

		    $('#loadButton').click(function(e) {
		        e.stopPropagation();
		        _self.on_load();
		    });

		    $('.boundary').on('click', function(e) {
		        _self.on_boundary(e, _self);
		    });

		    $('body').on('keydown', function(e) {
		        if( e.which == 77 ) 
		        	_self.mute_selected();
		    });
		    
		    $('#refresh').on('click', function(e) { 
		        $(this).css({'-webkit-animation': 'refreshSpin 1s'});
		        $(this._container).trigger("refreshAll");
		        setTimeout(function(){
		            $('#refresh').css({'-webkit-animation': ''});
		        }, 1000);
		    });
		},
		
		/**
		 * Updates the save/loading functions based on the view's state
		 * currently set up for the list view only
		 */
		updateSaveLocation : function (location)
		{
			console.log(location);
			// get the save location
			if(location){
				window.saveLocation = location;
			}else{
				window.saveLocation = '';
			}
			
			// update the save button's link
			$('#saveButton').attr('href', window.saveLocation);

			// if saving is not ready, disable the save button
			if(window.saveLocation == '')	
			{
				$('#saveButton, #loadButton').addClass('disabled');
			}
			// if saving is ready, enable the save button
			else
			{
				$('#saveButton, #loadButton').removeClass('disabled');
			}
		},
		

		//clears and disables to connection properties bar
		clearConnectionProperties : function ()
		{
	        $(".mode").removeClass("modesel");
	        $("*").removeClass('waiting');
	        $(".topMenu input").val('');
	        //$('.boundary').removeAttr('class').addClass('boundary boundaryNone');
	        $('.signalControl').children('*').removeClass('disabled');
	        $('.signalControl').addClass('disabled');
		},
		
		
		// conn object with arguments for the connection
		updateConnectionPropertiesFor : function(conn)
		{
			var conns = view.get_selected_connections();
			
		    if (conns.length == 1) {
		        if (conns[0].src_name == conn.src_name
		            && conns[0].dest_name == conn.dest_name)
		        {
		            this.updateConnectionProperties(conns);
		        }
		    }
		},
		
		
		updateConnectionProperties : function()
		{
			this.clearConnectionProperties();

			var conns = view.get_selected_connections();

			// if there is one connection selected, display its properties on top
		    if (conns.length == 1) {
		        var c = conns[0];
		        var mode = this.connectionModes[c.mode];
		        $('.signalControl').removeClass('disabled');
		        $('.signalControl').children('*').removeClass('disabled');
		        $(".mode"+mode).addClass("modesel");
		        $(".expression").val(c.expression);
		        if (c.src_min!=null) { $("#src_min").val(c.src_min); }
		        if (c.src_max!=null) { $("#src_max").val(c.src_max); }
		        if (c.dest_min!=null) { $("#dest_min").val(c.dest_min); }
		        if (c.dest_max!=null) { $("#dest_max").val(c.dest_max); }
		        
		        
		        if (c.bound_min!=null) { this.set_boundary($("#boundaryMin"),c.bound_min,0);};
		        if (c.bound_max!=null) { this.set_boundary($("#boundaryMax"),c.bound_max,1);};
		    }
		},
		
		
		selected_connection_set_input : function (what,field)
		{
			var conns = view.get_selected_connections(model.connections);
			if (!conns.length) return;
			 
			 
			for (var i in conns) {
				if (conns[i][what] == field.value || conns[i][what] == parseFloat(field.value))
					continue;
				var msg = {};
				 
				// copy src and dest names
				msg['src_name'] = conns[i]['src_name'];
				msg['dest_name'] = conns[i]['dest_name'];

				// set the property being modified
				if (what == 'mode')
					msg[what] = connectionModeCommands[connectionModes[conns[i][what]]];
				else
					msg[what] = field.value;

				// is expression is edited, switch to expression mode
				if (what == 'expression' && conns[i]['mode'] != 'Expr')
					msg['mode'] = 'expression';
				 
				// send the command, should receive a /connection/modify message after.
				$(this._container).trigger("setConnection", [msg]);

			    $(field).addClass('waiting');
			}
		},
		
		selected_connection_set_mode : function (modestring)
		{
		    var modecmd = this.connectionModeCommands[modestring];
		    if (!modecmd) return;

		    var conns = view.get_selected_connections(model.connections);
		    if (!conns.length) return;
		    
		    var msg = { 'mode' : modecmd };
		    
		    for (var i in conns) {
		    	if (conns[i]['mode'] == modestring)
		    		continue;
		    	msg['src_name'] = conns[i]['src_name'];
		    	msg['dest_name'] = conns[i]['dest_name'];
		    	$(this._container).trigger("setConnection", [msg]);	// trigger switch event
		    }
		},

		copy_selected_connection : function ()
		{
		    var conns = view.get_selected_connections(model.connections);
		    if (conns.length!=1) return;
		    var args = {};

		    // copy existing connection properties
		    for (var c in conns[0]) {
		        args[c] = conns[0][c];
		    }
		    return args;
		},
		
		on_load : function()
		{
			var _self = this;
			
		    //A quick fix for now to get #container out of the way of the load dialogs
		    var body = document.getElementsByTagName('body')[0];
		    var iframe = document.createElement('iframe');
		    iframe.name = 'file_upload';
		    iframe.style.visibility = 'hidden';
		    body.appendChild(iframe);

		    var form = document.createElement('form');
		    form.innerHTML = '<input id="file" type="file"                   \
		                       name="mapping_json" size="40" accept="json">  \
		                      <input type="submit" style="display: none;">   \
		                      <input type="button" value="Cancel" id="cancel">';
		    form.method = 'POST';
		    form.enctype = 'multipart/form-data';
		    form.action = '/load';
		    form.target = 'file_upload';

		    var l = document.createElement('li');
		    l.appendChild(form);
		    $('.topMenu').append(l);

		    iframe.onload = function(){
		        var t = $(iframe.contentDocument.body).text();
		        if (t.search('Success:')==-1 && t.search('Error:')==-1)
		            return;
		        _self.notify($(iframe.contentDocument.body).text());
		        $(l).remove();
		        body.removeChild(iframe);
		    };

		    $('#cancel',form).click(function(){
		        $(l).remove();
		        $('#container').removeClass('onLoad');
		        body.removeChild(iframe);
		    });

		    form.firstChild.onchange = function(){

		        var fn = document.createElement('input');
		        fn.type = 'hidden';
		        fn.name = 'filename';
		        fn.value = form.firstChild.value;
		        form.appendChild(fn);

		        // The devices currently in focused
		        var devs = view.get_focused_devices();
		        // Split them into sources and destinations
		        var srcdevs = [];
		        var destdevs = [];
		        for (var i in devs.contents) {
		            if( devs.contents[i].n_outputs )
		                srcdevs.push( devs.contents[i].name );
		            if( devs.contents[i].n_inputs )
		                destdevs.push( devs.contents[i].name );
		        }

		        //So that the monitor can see which devices are being looked at
		        var srcs = document.createElement('input');
		        srcs.type = 'hidden';
		        srcs.name = 'sources';
		        srcs.value = srcdevs.join(); 
		        form.appendChild(srcs);
		        var dests = document.createElement('input');
		        dests.type = 'hidden';
		        dests.name = 'destinations';
		        dests.value = destdevs.join(); 
		        form.appendChild(dests);

		        form.submit();
		    };
		    return false;
		},
		
		on_boundary : function(e, _self)
		{
		    for (var i in this.boundaryIcons) {
		        if ($(e.currentTarget).hasClass(this.boundaryIcons[i]))
		            break;
		    }
		    if (i >= this.boundaryIcons.length)
		        return;

		    var b = [0, 3, 3, 1, 2, 4][i];
		    b = b + 1;
		    if (b >= this.boundaryModes.length)
		        b = 0;

		    // Enable this to set the icon immediately. Currently disabled
		    // since the 'waiting' style is not used to indicate tentative
		    // settings for boundary modes.

		    // set_boundary($(e.currentTarget), b,
		    //              e.currentTarget.id=='boundaryMax');
		    
		    _self.selected_connection_set_boundary(b, e.currentTarget.id=='boundaryMax',
		                                     e.currentTarget);

		    e.stopPropagation();
		},
		
		selected_connection_set_boundary : function (boundarymode, ismax, div)
		{
		    var args = this.copy_selected_connection();

		    if( !args ) 
		    	return;

		    // TODO: this is a bit out of hand, need to simplify the mode
		    // strings and indexes.
		    var modecmd = this.connectionModeCommands[this.connectionModes[args['mode']]];
		    args['mode'] = modecmd;

		    var c = ismax ? 'bound_max' : 'bound_min';
		    args[c] = boundarymode;

		    // send the command, should receive a /connection/modify message after.
		    $(this._container).trigger("setConnection", [args]);	

		    // Do not set the background color, since background is used to
		    // display icon.  Enable this if a better style decision is made.
		    //$(div).addClass('waiting');
		},
		
		notify : function (msg)
		{
		    var li = document.createElement('li');
		    li.className = 'notification';
		    li.innerHTML = msg;
		    $('.topMenu').append(li);
		    setTimeout(function(){
		        $(li).fadeOut('slow', function(){ $(li).remove();});
		    }, 5000);
		},
		
		set_boundary : function (boundaryElement, value, ismax)
		{
		    for (var i in this.boundaryIcons)
		        boundaryElement.removeClass(this.boundaryIcons[i]);

		    if (value == 0) {//'None' special case, icon depends on direction
		        if (ismax)
		            boundaryElement.addClass('boundaryUp');
		        else
		            boundaryElement.addClass('boundaryDown');
		    }

		    if (value == 3) { //'Fold' special case, icon depends on direction
		        if (ismax)
		            boundaryElement.addClass('boundaryDown');
		        else
		            boundaryElement.addClass('boundaryUp');
		    }
		    else if (value < 5) {
		        boundaryElement.addClass('boundary'+ this.boundaryModes[value]);
		    }
		},
		
		mute_selected : function()
		{
		    var conns = view.get_selected_connections(model.connections);

		    for ( var i in conns ) {
		        var args = conns[i];
		        if ( args.muted == 0 ) {
		            args.muted = 1;
		        }
		        else 
		            args.muted = 0;

		        // TODO: why modes aren't just stored as their strings, I don't know
		        var modecmd = connectionModeCommands[connectionModes[args['mode']]];
		        args['mode'] = modecmd;

		        $(this._container).trigger("setConnection", [args]);
		    }
		},
		
		checkBrowserSupport : function()
		{
			
		  	// Check browser supports File loading with JS
		  	if (window.File && window.FileReader && window.FileList && window.Blob) 
		  	{
		  		console.log('Loading file API supported.');
		  		var _self = this;

		  		$('#fileinput').change( function (e){
		  			
			  			var file = e.target.files[0]; 
					  	var filename = file.name;
					  	if (file) 
					  	{
					  		var reader = new FileReader();
					  		reader.onload = function(e) { 
					  			var contents = e.target.result;
					  			mapA = JSON.parse(contents);
					  			_self.initData(mapA);
					  			view.update_display();
					  		};
					  		reader.readAsText(file);
					  	} 
					  	else { 
					  		alert("Failed to load file");
					  	}
		  			
		  			});
		  	} 
		  	else 
		  		console.log('Loading files is not supported in this browser');
		},
		
		readSingleFile : function (evt) 
		{
			
		},
		
	/* MODEL from JSON files (V1)
	    
	  	// mapping.destinations
	  	id: "d0"
	  	device: "delaydesigner.1"
	  	signal: "14_channel/control/79/globa

	  	// mapping.sources
	  	id: "s0"
	  	device: "71tstick.1"
	  	signal: "instrument/grip/tip/touch"
	    
	  	// mapping.connections
	      clipMax: "none"
	      clipMin: "none"
	      expression: "d0=s0*(-1)+(1)"
	      mode: "linear"
	      mute: 0
	      range: Array[4]
	  */
		
	  initData : function (data)
	  {
				console.log("initing")
			/*
			 			 
		if(!data.mapping || !data.mapping.sources || !data.mapping.destinations || !data.mapping.connections)
		  		return;

	  	var devicesTemp = [];		// my array to store devices as they are made -to avoid duplicates
	  	var signalsArray = [];		// my associative array to access later when loading connections
	  	
	  	var initDevs = function (sources, isSources)
	  	{
	  		for (var i=0; i<sources.length; i++)
	  	  	{
	  	  		var source = sources[i];
	  	  		
	  	  		// create the device object if it doesn't already exist
	  	  		if(arrIsUnique(source.device, devicesTemp))
	  	  		{
	  	  			devicesTemp.push(source.device.toString());
	  	  			var devArgs = new Object(); 
	  	  			devArgs.name = source.device;
	  	  			devArgs.n_inputs = 0;
	  	  			devArgs.n_outputs = 0;
	  	  			model.devices.add(source.device, devArgs);
	  	  		}

	  	  		// create the object for the model
	  	  		var args = new Object(); 
	  	  		args.device_name = source.device;
	  	  		args.name = source.signal;
	  	  		args.id = source.id;
	  	  		model.signals.add(source.device+source.signal, args);
	  	  		
	  	  		// push to my associative array to access later when loading connections
	  	  		signalsArray[source.id] = args;
	  	  		
	  	  		// increment device signal count
	  	  		var dev = model.devices.get(source.device);
	  	  		if(isSources)
	  	  			dev.n_outputs = parseInt(dev.n_outputs) + 1;
	  	  		else
	  	  			dev.n_inputs = parseInt(dev.n_inputs) + 1;
	  	  	}
	  	};
	  	
	  	// for each source device/signal
	  	initDevs(data.mapping.sources, true);

	  	// for each source device/signal
	  	initDevs(data.mapping.destinations, false);
	  	
	  	
	    // for each connection
	    for (var i=0; i<data.mapping.connections.length; i++)
	  	{
	  		var connection = data.mapping.connections[i];

	  		//  split the equation LHS and RHS
	  		var expr = connection.expression;
	  		var split = expr.split("=");

	  		// dest
	  		var y = split[0];
	  		var destDevice = signalsArray[y].device;
	  		var destSignal = signalsArray[y].signal;

	  		// source
	  		var patt=/s\d+/gi;
	  		var result=patt.exec(split[1]);
	  		var x = result[0];
	  		var newExpr = split[1].replace( patt,"x");
	  	  	
	  		// match 
	  		var srcSignal = signalsArray[x].name; 
	  		var srcDevice = signalsArray[x].device_name;
	  		var	dstSignal = signalsArray[y].name;
	  		var dstDevice = signalsArray[y].device_name;
	  		var key = srcDevice + srcSignal + ">" + dstDevice + dstSignal;
	  		
	  		// create the link object for the model if not already linked
	  		if(this.model.isLinked(srcDevice, dstDevice) == false)
	  		{
	  			var linkKey = srcDevice + ">" + dstDevice;
	  			var linkArgs = new Object(); 
	  			linkArgs.src_name = srcDevice;
	  			linkArgs.dest_name = dstDevice;
	  			model.links.add(linkKey, linkArgs);
	  		}
	  		
	  		// create the connection object for the model
	  		var args = new Object(); 
	  		args.src_name = srcDevice + srcSignal;
	  		args.dest_name = dstDevice + dstSignal;
	  		args.muted = connection.mute;
	  		args.range = connection.range;
	  		args.expression = 'y=' + newExpr;
	  		args.mode = connection.mode;
	  		//args.bound_min = 0;
	  		//args.dest_length = 1;
	  		//args.src_length = 1;
	  		//args.bound_max = 0;
	  		//args.src_type = 'f';
	  		//args.dest_type = 'f';
	  		model.connections.add(key, args);
	  	}
	  	
	  	*/
	 }

};








