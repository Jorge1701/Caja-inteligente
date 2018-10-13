#include <VirtualWire.h>
#include "Caja.h"
#include "ControlarCamara.h"

Caja caja( A13, 32, 22, 23, 0, 4 );

ControlarCamara camara( 10, 12 );

long tiempoInicial;
int tiempo;

const int mandarFRCada = 2500;
int mandarSiguienteFR = 0;

const int alarmaEn = 10000;
int alarmaTiempo = 0;

const int receptor = A0;

const int rotarX = 10;
const int rotarY = 10;

const int pinSalida = 2;
const int pinSalida2 = 3;

void setup() {
  vw_setup( 2000 );
  vw_set_rx_pin( receptor );
  vw_rx_start();
  
  Serial.begin( 9600 );
  
  caja.iniciar();

  tiempoInicial = millis();
  tiempo = 0;

  pinMode( pinSalida, OUTPUT );
  digitalWrite( pinSalida, HIGH );
  pinMode( pinSalida2, OUTPUT );
  digitalWrite( pinSalida2, HIGH );

  camara.girarA(50, 0);
}

void loop() {
  long tiempoActual = millis();
  tiempo = tiempoActual - tiempoInicial;
  tiempoInicial = tiempoActual;
  
  caja.actualizarTarjeta();
  
  if ( caja.estaMonitoreando() ) {
    caja.detectarApertura();
    
    mandarSiguienteFR += tiempo;
    
    if ( mandarSiguienteFR >= mandarFRCada ) {
      caja.mandarFotoResistencia();
      mandarSiguienteFR = 0;
    }
  }

  if ( caja.estaEnAlerta() ) {
    alarmaTiempo += tiempo;

    if ( isClaveCorrecta() ) {
      json( "claveIngresada", "true" );
      caja.alarmaTermino();
    }
    
    if ( alarmaTiempo >= alarmaEn ) {
      caja.sonarAlarma();
      caja.alarmaTermino();
      alarmaTiempo = 0;
    }
  } else {
    alarmaTiempo = 0;
    isClaveCorrecta();
  }

  if ( Serial.available() ) {
    String s = Serial.readString();

    bool movido = false;
    if ( s == "0" ) {
      if ( caja.estaMonitoreando() ) {
        caja.detenerMonitoreo();
      } else {
        caja.iniciarMonitoreo();
      }
    } else if ( s == "1" ) {
      caja.mandarMonitoreo2();     
    } else if ( s == "2" ) {
      caja.mandarEstado2();
    } else if ( s == "4" ) {
      camara.aumentar( 0, -5 );
      movido = true;
    } else if ( s == "5" ) {
      camara.aumentar( 0, 5 );
      movido = true;
    } else if ( s == "6" ) {
      camara.aumentar( -5, 0 );
      movido = true;
    } else if ( s == "7" ) {
      camara.aumentar( 5, 0 );
      movido = true;
    }

    if ( s.indexOf( "," ) > 0 ) {
      int x = ( int ) ( s.substring( 2, s.indexOf( "," ) ).toFloat() * rotarX );
      int y = ( int ) ( s.substring( s.indexOf( "," ) + 3, s.length() ).toFloat() * rotarY );

      camara.aumentar( -x, y );
    }

    if ( movido ) {
      json( "x", camara.getX() );
      json( "y", camara.getY() );
    }
  }

  camara.actualizar();
}

bool isClaveCorrecta() {
  bool correcta = false;
  uint8_t buf[VW_MAX_MESSAGE_LEN];
  uint8_t buflen = VW_MAX_MESSAGE_LEN;

  if ( vw_get_message( buf, &buflen ) ) {
    String clave = "";
    
    for ( int i = 0; i < buflen; i++ ) {
      clave += ( char ) buf[i];
    }
    
    correcta = clave == "1234";
    
    if ( !correcta && caja.estaEnAlerta() )
      json( "claveIngresada", "false" );
  }
  
  return correcta;
}
