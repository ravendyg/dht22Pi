// Playing with CPU modified after raspberrypi.org/forums/viewtopic.php?t=52393
// Don't see to the CPU itself, but it is strongly advised not to run on smth working in real time
// and crucially depending on the immediate response. This app will block all interrupts handling for
// at least a few ms. But, I guess, if you are running smth that serious you know better then me ).

#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>
#include <iostream>
#include <fstream>
#include <ctime>
#include <math.h>
#include <string>
#include <sstream>

using namespace std;

#define GPIO_BASE 0x20200000
#define TIMER_BASE 0x20003000
#define INT_BASE 0x200B000
							// 15
volatile unsigned *gpio, *gpset, *gpclr, *gpin, *timer, *intrupt;

#define START *(gpio+1) |= (1 << 24)		// GPIO 18 output
#define STOP  *(gpio+1) &= ~(7 << 24)		// GPIO 18 input
#define CLKHI *gpset = (1 << 18)		// GPIO 18 hi
#define CLKLO *gpclr = (1 << 18)		// GPIO 18 lo
#define PULHI *(gpio+37) = 2			// pull up GPIO 18
#define PULLO *(gpio+37) = 1			// pull down GPIO 18
#define SIN   (*gpin & (1 << 18))		// GPIO 18 in value
#define SON   *gpset = (1 << 2)			// GPIO 2 hi for debugging
#define SOFF  *gpclr = (1 << 2)			// GPIO 2 lo
#define ESCIN (*gpin & (1 << 18))		// GPIO 18 value

int setup(void);
int interrupts(int flag);				// 30
int checkData(int data[]);

int main () {
	int n, counter;
	unsigned int timend;
	int data[40];

	for (int iter=0;iter<5;iter++) {		// 5 aatempts before giving up
		usleep(1000000);			// 1 second delay to finish any pending interrupts caused by the program start

		setup();				// setup GPIO, timer and interrupt pointers

		interrupts(0);				// disable interrupts
								// 43
		CLKHI;					// start data request
		timend = *timer + 500;			// set up 500 mus delay from current timer value
		while ( (((*timer)-timend) & 0x80000000) != 0);
		CLKLO;
		timend = *timer + 500;			// set up 500 mus delay from current timer value
		while ( (((*timer)-timend) & 0x80000000) != 0);
		STOP;					// end data request
//		SON;

		timend = *timer + 262;			// skip confirmation from the sensor, better process
								// 54
		for (counter=0; counter < 40; counter++) {
//			SOFF;
			if (counter % 8 == 0) {
				timend += 11;		// additional gap between bits
			}
			while ( (((*timer)-timend) & 0x80000000) != 0);

//			SON;
			if (SIN == 0) {			// was '0'
				data[counter] = 0;
				timend = *timer + 80;	// 80 us shift
			} else {			// was '1'
				data[counter] = 1;
				timend = *timer + 129;	// 129 us shift
			}
		}						// 70
		interrupts(1);				// re-enable intrerrupts


		if (checkData(data) == 1) {		// control sum is OK
			double temp = 0, hum = 0;
			time_t t = time(0);		// get time
			struct tm * now = localtime(&t);

			for (int i=14;i>=0;i--) {
				hum += data[15-i] * pow(2, i);
				temp += data[15-i + 16] * pow(2,i);
			}
			hum /= 10;
			temp /= 10;
			if (data[16] == 1) {		// negative temp
				temp *= (-1);

			}

			string str, strf;		// put date and time into string
			stringstream strs;
			strs << now->tm_year+1900;
			strs << "-";
			if (now->tm_mon < 10) {
				strs << "0" << now->tm_mon+1;
			} else {
				strs << now->tm_mon+1;
			}
			strs << "-";
			if (now->tm_mday < 10) {
				strs << "0" << now->tm_mday;
			} else {
				strs << now->tm_mday;
			}

			str = strs.str();		// enough for file name

			strs << " ";			// for the record
			if (now->tm_hour < 10) {
				strs << "0" << now->tm_hour;
			} else {
				strs << now->tm_hour;
			}
			strs << ":";
			if (now->tm_min < 10) {
				strs << "0" << now->tm_min;
			} else {
				strs << now->tm_min;
			}


				// write data to the file: long - for permanent storage, short for javascript
			ofstream myFile;
			strf = "/home/pi/temp/data";
			strf.append(str);
			strf.append(".txt");
			str = strs.str();		// complete time as string
			cout << "Humidity: " << hum << "; Temperature: " << temp << "; Time: " << str << endl;
			myFile.open(strf.c_str(), ios:: out | ios::app);
			if (myFile.is_open()) {
				myFile << hum << "\t" << temp << "\t" << str << "\t\n";
				myFile.close();
			} else {
				cout << "Unable to open long file" << endl;
			}
			myFile.open("/home/pi/temp/tempData.txt", ios:: out | ios::trunc);
			if (myFile.is_open()) {
				myFile << hum << "\t" << temp << "\t" << str << endl;
				myFile.close();
			} else {
				cout << "Unable to open short file" << endl;
			}
			return (0);
		}

		usleep(5000000);			// wait for 5 sec fo the sensor to start again

	}

	return(1);
}

/*****
interrupts(0) - disable					// 90
interrupts(1) - enable

return 1 == OK
       2 == error with message print
****/
int interrupts (int flag) {
	static unsigned int sav132 = 0;
	static unsigned int sav133 = 0;
	static unsigned int sav134 = 0;

	if (flag == 0) {			// disable
		if (sav132 != 0) {		// interrupts are already disabled
			return(0);
		}

		if ( (*(intrupt+128) | *(intrupt+129) | *(intrupt+130)) != 0) {
			printf("Pending interrupts\n");
			return(0);
		}
							// 110
		sav134 = *(intrupt+134);
		*(intrupt+137) = sav134;
		sav132 = *(intrupt+132);	// save current interrupts
		*(intrupt+135) = sav132;	// disable active interrupts
		sav133 = *(intrupt+133);
		*(intrupt+136) = sav133;
	} else {				// flag = 1 ernable
		if (sav132 == 0) {
//			printf("Interrupts not disabled\n");
			return(0);
		}

		*(intrupt+132) = sav132;	// restore saved interrupts
		*(intrupt+133) = sav133;
		*(intrupt+134) = sav134;
		sav132 = 0;			// indicates interrupts enabled
	}
	return(1);
}							// 130

/***
sets up GPIO
sets timer and interrupt pointers
return 1 == OK
       2 == error with message print
***/
int setup() {
	int memfd;
	unsigned int timend;
	void *gpio_map, *timer_map, *int_map;

	memfd = open("/dev/mem", O_RDWR|O_SYNC);
	if (memfd < 0) {
		printf("Mem open error\n");
		return(0);
	}

	gpio_map = mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_SHARED, memfd, GPIO_BASE);
	timer_map = mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_SHARED, memfd, TIMER_BASE);
	int_map = mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_SHARED, memfd, INT_BASE);
							// 152
	close(memfd);

	if (gpio_map == MAP_FAILED || timer_map == MAP_FAILED || int_map == MAP_FAILED) {
		printf("Map failed\n");
		return(0);
	}

	intrupt = (volatile unsigned *)int_map; // interrupts pointer
	timer = (volatile unsigned *)timer_map; // timer pointer
	++timer;				// timer lo 4 bytes
						// timer hi 4 bytes available *(timer+1)

	// GPIO pointers
	gpio = (volatile unsigned *)gpio_map;
	gpset = gpio + 7;			// set bit register offset 28
	gpclr = gpio + 10;			// clr bit register
	gpin = gpio + 13;			// read all bits register

	//  setup GPIO 18 input				// 169
	*(gpio+1) &= ~(7 << 24);		// GPIO 18 zero 3 bits - input
	*(gpio+1) |= (1 << 24);			// GPIO 18 output
	*(gpio)   &= ~(7 << 6);			// GPIO 2 - input
	*(gpio)   |= (1 << 6);			// GPIO 2 - output
//	*gpclr = (1<< 24);
//	*(gpio+37) = 1;				// pull up

	return(1);
}

/***
checks the parity (5-th) byte
return	1 - OK
	0 - smth wrong
***/
int checkData (int data[]) {				// 185
	int sum[] = {0, 0, 0, 0, 0, 0, 0, 0};
	int i;
	for (i = 0; i<8; i++) {
		for (int j=0; j<4; j++) {	// sum 4 bits in every byte
			sum[i] += data[8*j+i];
		}
	}
	for (i=7; i>=0;i--) {			// carry on
		if (sum[i] > 1) {
			if (i>0) {
				sum[i-1] += sum[i] / 2;
			}
			sum[i] = sum[i] % 2;
		}
	}
	for (i=0;i<8;i++) {
		if (sum[i] != data[32+i]) {
			cout << "control sum is wrong" << endl;
			return(0);
		}
	}

	return(1);
}
