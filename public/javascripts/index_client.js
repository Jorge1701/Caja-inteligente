let socket = io();

var mesajes = document.getElementById("mensajes");

function agregarMensaje(mensaje) {
	var p = document.createElement("p");
	p.innerHTML = mensaje;
	mensajes.appendChild(p);
}

socket.on('connect', () => {
	console.log('Conectado por socket.io');
});

socket.on('data', (json) => {
	console.log( json );
	if(json.monitoreando != undefined){
		btnMonitoreo.style.display = 'initial';
		if(json.monitoreando == 1){
			monitoreo.innerHTML = 'Encendido';
			btnMonitoreo.innerHTML = 'Apagar';
			socket.emit("inicio");
		}else{
			monitoreo.innerHTML = 'Apagado';
			btnMonitoreo.innerHTML = 'Encender';
			luz.innerHTML = '-';
			apertura.innerHTML = '-';
		}

	}else if(json.FotoResistencia != undefined){
		luz.innerHTML = json.FotoResistencia;
	}else if(json.caja != undefined){
		if(json.caja == 1){
			apertura.innerHTML = 'Cerrada';
		}else{
			apertura.innerHTML = 'Abierta';
		}

	}else if(json.foto != undefined){
		foto.src = 'data:image/png;base64,'+json.foto;

	} else if (json.clave != undefined) {
		if (json.clave == "true") {
			agregarMensaje("Ingreso de clave correcto");	
		}
	} else if (json.alerta != undefined) {
		agregarMensaje("La caja se ha abierto, esperando clave...");
	} else if (json.claveIngresada != undefined && json.claveIngresada === "false" ) {
		agregarMensaje("Ingreso de clave incorrecto");
	} else if (json.claveIngresada != undefined && json.claveIngresada === "true" ) {
		agregarMensaje("Ingreso de clave correcto!");
		agregarMensaje("Alarma desactivada");
	} else if (json.x != undefined) {
		document.getElementById( 'posX' ).innerHTML = json.x;
	} else if (json.y != undefined) {
		document.getElementById( 'posY' ).innerHTML = json.y;
	} else if (json.alarma != undefined ) {
		agregarMensaje("Alarma activada!");
	}
});

socket.on('estadoMCU', estado => {
	estadoMCU.innerHTML = estado;
	if(estado == 'Desconectado'){
		monitoreo.innerHTML = '-';
		btnMonitoreo.style.display = 'none';
		luz.innerHTML = '-';
		apertura.innerHTML = '-';
	}
});

socket.on( 'imgProcesada', ( img ) => {
	imagen.src = 'http://190.64.134.67:60000' + img;
} );

btnMonitoreo.onclick = () => {
	socket.emit('cambiarMonitoreo');
}

window.onload = () => {
	document.getElementById( 'btnIzq' ).onclick = () => {
		socket.emit( "mover", "x=-1,y=0" );
	};
	document.getElementById( 'btnDer' ).onclick = () => {
		socket.emit( "mover", "x=1,y=0" );
	};
	document.getElementById( 'btnArr' ).onclick = () => {
		socket.emit( "mover", "x=0,y=-1" );
	};
	document.getElementById( 'btnAba' ).onclick = () => {
		socket.emit( "mover", "x=0,y=1" );
	};

	let video = document.getElementById('camara');

	video.onclick = function ( e ) {
		var x = e.pageX - $( '#camara' ).offset().left;
		var y = e.pageY - $( '#camara' ).offset().top;

		let posX = ((x / $( '#camara' ).width()) - .5) * 2;
		let posY = ((y / $( '#camara' ).height()) - .5) * 2;

		socket.emit( "mover", "x=" + posX + ",y=" + posY );
	};

	if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
		navigator.mediaDevices.enumerateDevices().then( (dispositivos) => {
			console.log( dispositivos );
			dispositivos.map( ( d ) => {
				if ( d.deviceId === '01bc7cc30265f1687c4654db8207a33b8547c2b40be469c3a83aada49e864e50' ) // Logitech HD Pro Webcam C920 (046d:082d)
					navigator.mediaDevices.getUserMedia( { video: { deviceId: d.deviceId } } ).then( ( stream ) => {
						video.src = window.URL.createObjectURL( stream );
						setInterval(() => {
							canvas.height = video.videoHeight;
							canvas.width = video.videoWidth;
							var ctx = canvas.getContext('2d');
							ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
							console.log(canvas.toDataURL());
							socket.emit('imagen',canvas.toDataURL());
						}, 1000);
					} )
					.catch( ( err ) => {
						console.log( err );
					} );
			} );
		} )
		.catch( ( err ) => {
			console.log( err );
		} );
	}

	socket.emit("inicio2");
};