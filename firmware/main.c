// Snowflake Studio frame player. RP2040 / 12 MHz / GD25Q64, generic 03h boot.
// Frames are rendered by the same engine as the browser preview; no arbitrary AI code.
#include <stdint.h>
#include "pico/stdlib.h"
#include "hardware/pio.h"
#include "hardware/clocks.h"
#include "ws2812.pio.h"
#define FRAME_BASE 0x10040000u
#define MAGIC 0x534e4f57u
#define MAX_LEDS 444u
#define MAX_FRAMES 1800u
#define MAX_BYTES (8u*1024u*1024u-0x40000u-256u)
typedef struct { uint32_t magic, version, leds, frames, fps, pin, length, crc; } Header;
static uint32_t crc32(const uint8_t *p, uint32_t n) {
 uint32_t crc=0xffffffffu;
 while(n--) { crc ^= *p++; for(int j=0;j<8;j++) crc=(crc>>1)^((0u-(crc&1u))&0xedb88320u); }
 return ~crc;
}
int main(void) {
 const Header *h=(const Header*)FRAME_BASE;
 const uint8_t *data=(const uint8_t*)(FRAME_BASE+256);
 // Keep all external GPIOs inputs if the package is invalid.
 if(h->magic!=MAGIC || h->version!=1 || h->leds<37 || h->leds>MAX_LEDS || h->leds%37 || h->frames<1 || h->frames>MAX_FRAMES || h->fps<10 || h->fps>30 || h->pin<20 || h->pin>28 || h->length!=h->leds*h->frames*3 || h->length>MAX_BYTES || crc32(data,h->length)!=h->crc) {
  while(1) tight_loop_contents();
 }
 PIO pio=pio0; uint sm=0, pin=h->pin;
 uint offset=pio_add_program(pio,&ws2812_program);
 pio_gpio_init(pio,pin);
 pio_sm_set_consecutive_pindirs(pio,sm,pin,1,true);
 pio_sm_config c=ws2812_program_get_default_config(offset);
 sm_config_set_sideset_pins(&c,pin);
 sm_config_set_out_shift(&c,false,true,24);
 sm_config_set_fifo_join(&c,PIO_FIFO_JOIN_TX);
 sm_config_set_clkdiv(&c,(float)clock_get_hz(clk_sys)/8000000.0f);
 pio_sm_init(pio,sm,offset,&c);
 pio_sm_set_enabled(pio,sm,true);
 sleep_ms(10);
 uint32_t frame=0;
 for(;;) {
  absolute_time_t deadline=make_timeout_time_us(1000000u/h->fps);
  const uint8_t *p=data+frame*h->leds*3;
  for(uint32_t i=0;i<h->leds;i++,p+=3) {
   // Stored bytes RGB -> WS2812 GRB, most significant bit first.
   uint32_t word=((uint32_t)p[1]<<24)|((uint32_t)p[0]<<16)|((uint32_t)p[2]<<8);
   pio_sm_put_blocking(pio,sm,word);
  }
  while(!pio_sm_is_tx_fifo_empty(pio,sm)) tight_loop_contents();
  // FIFO can empty while OSR still transmits one 30 us pixel. Extra 400 us ensures reset >280 us.
  sleep_us(400);
  sleep_until(deadline);
  frame=(frame+1)%h->frames;
 }
}
