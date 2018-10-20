let socket = io();
var caja;
var SPEED = 0.01;

var mensajes = document.getElementById("mensajes");

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
	} else if ( json.gx != undefined ) {
		caja.rotation.x = json.gx * Math.PI / 180;
	} else if ( json.gy != undefined ) {
		caja.rotation.y = json.gy * Math.PI / 180;

	} else if ( json.ax != undefined ) {
		if ( ax ) {
			aceleracion( json.ax, "x" );
			ax = false;
			setTimeout( () => {
				ax = true;
			}, 5000 );
		}
	} else if ( json.ay != undefined ) {
		if ( ay ) {
			aceleracion( json.ay, "y" );
			ay = false;
			setTimeout( () => {
				ay = true;
			}, 5000 );
		}
	} else if ( json.az != undefined ) {
		if ( az ) {
			aceleracion( json.az, "z" );
			az = false;
			setTimeout( () => {
				az = true;
			}, 5000 );
		}
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

let ax = true, ay = true, az = true;

function aceleracion ( acc, eje ) {
	if ( window.speechSynthesis === undefined )
		return;
	
	let ssu = new SpeechSynthesisUtterance( "Se produjo una aceleración de " + acc + " metros por segundo al cuadrado en el eje " + eje );
	ssu.lang = "es-UY";
	window.speechSynthesis.speak( ssu );
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
				if ( d.deviceId === '4d32c60b322a3901ffb6c53565a612cd7e77bdd3a2f38aad1c112f46d95d3851' ) // Logitech HD Pro Webcam C920 (046d:082d)
					navigator.mediaDevices.getUserMedia( { video: { deviceId: d.deviceId } } ).then( ( stream ) => {
						video.src = window.URL.createObjectURL( stream );
						setInterval(() => {
							canvas.height = video.videoHeight;
							canvas.width = video.videoWidth;
							var ctx = canvas.getContext('2d');
							ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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

	//caja three
	var scene,camera,renderer;
	var WIDTH = window.innerWidth;
	var HEIGTH = window.innerHeight;

	function init(){
		scene = new THREE.Scene();
		initCamera();
		initRenderer();
		initCaja();

		document.getElementById("caja3D").appendChild(renderer.domElement);
	}

	function initCaja(){
		caja = new THREE.Mesh(new THREE.CubeGeometry(2,2,2), new THREE.MeshNormalMaterial());
		scene.add(caja);
	}

	function rotateCaja(){
		caja.rotation.x = 0;
		caja.rotation.y = 0;
		caja.rotation.z = 0;

		console.log( caja.rotation.x );
	}

	function initCamera() {
		camera = new THREE.PerspectiveCamera( 70, WIDTH / HEIGTH, 1, 1000 );
		camera.position.set(0,0,5);
		camera.lookAt(scene.position);
	}
	
	function initRenderer(){
		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(WIDTH,HEIGTH);
	}

	function render(){
		requestAnimationFrame(render);
		// rotateCaja();
		renderer.render(scene,camera);
	}

	init();
	render();
};