#include <VirtualWire.h>
#include <Wire.h>
#include "Caja.h"
#include "ControlarCamara.h"

const int MPU = 0x68;

const float A_R = 16384.0;
const float G_R = 131.0;

const float RAW_A_MS2 = 9.8 / 15200;

const float marg = 1;
 
const float RAD_A_DEG = 57.295779;

float antAccX, antAccY, antAccZ;
float accX, accY;
float gyrX, gyrY;
float x, y;

float anterior;

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

const int pinSalida = 5;
const int pinSalida2 = 3;

void setup() {
  vw_setup( 2000 );
  vw_set_rx_pin( receptor );
  vw_rx_start();
  
  Wire.begin();
  
  Wire.beginTransmission( MPU );
  Wire.write( 0x6B );
  Wire.write( 0 );
  Wire.endTransmission( true );
  Serial.begin( 9600 );

  anterior = millis();
  
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

    posicionamiento();
    
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

void posicionamiento() {
  Wire.beginTransmission( MPU );
  Wire.write( 0x3B );
  Wire.endTransmission( false );
  Wire.requestFrom( MPU, 6, true );

  int16_t ax = Wire.read() << 8 | Wire.read();
  int16_t ay = Wire.read() << 8 | Wire.read();
  int16_t az = Wire.read() << 8 | Wire.read();

  accY = atan( -1 * ( ax / A_R ) / sqrt( pow( ( ay / A_R ), 2 ) + pow( ( az / A_R ), 2 ) ) ) * RAD_A_DEG;
  accX = atan(      ( ay / A_R ) / sqrt( pow( ( ax / A_R ), 2 ) + pow( ( az / A_R ), 2 ) ) ) * RAD_A_DEG;

  float nuevAccX = ax * RAW_A_MS2;
  float nuevAccY = ay * RAW_A_MS2;
  float nuevAccZ = az * RAW_A_MS2;

  if ( abs( nuevAccX ) - abs( antAccX ) > marg )
    json( "ax", nuevAccX - antAccX );

  if ( abs( nuevAccY ) - abs( antAccY ) > marg )
    json( "ay", nuevAccY - antAccY );

  if ( abs( nuevAccZ ) - abs( antAccZ ) > marg )
    json( "az", nuevAccZ - antAccZ );
  
  antAccX = nuevAccX;
  antAccY = nuevAccY;
  antAccZ = nuevAccZ;
  
  Wire.beginTransmission( MPU );
  Wire.write( 0x43 );
  Wire.endTransmission( false );
  Wire.requestFrom( MPU, 4, true );
  
  int16_t gx = Wire.read() << 8 | Wire.read();
  int16_t gy = Wire.read() << 8 | Wire.read();

  gyrX = gx / G_R;
  gyrY = gy / G_R;

  float ahora = millis();
  float t = ( ahora - anterior ) / 1000;
  anterior = ahora;
  
  x = 0.98 * ( x + gyrX * t ) + 0.02 * accX;
  y = 0.98 * ( y + gyrY * t ) + 0.02 * accY;

  json( "gx", x );
  json( "gy", y );
}
