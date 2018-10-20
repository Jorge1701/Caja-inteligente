const int pinStep = 0;
const int pinDir = 2;

const int pinStep2 = 14;
const int pinDir2 = 12;

void setup() {
  pinMode( pinStep, OUTPUT );
  pinMode( pinDir, OUTPUT );

  digitalWrite( pinDir, HIGH );
  
  pinMode( pinStep2, OUTPUT );
  pinMode( pinDir2, OUTPUT );

  digitalWrite( pinDir2, LOW );

  Serial.begin( 115200 );
}

float vel = 0;
float inc = .5;
float a = .5;

void loop() {
  vel += inc;

  if ( vel >= 4000 )
    inc = -a;
  else if ( vel <= 900 )
    inc = a;

  Serial.println( vel );
  
  digitalWrite( pinStep, HIGH );
  delayMicroseconds( vel );
  digitalWrite( pinStep, LOW );
  delayMicroseconds( 4000 - vel );
  
  digitalWrite( pinStep2, HIGH );
  delayMicroseconds( vel );
  digitalWrite( pinStep2, LOW );
  delayMicroseconds( 4000 - vel );
}
