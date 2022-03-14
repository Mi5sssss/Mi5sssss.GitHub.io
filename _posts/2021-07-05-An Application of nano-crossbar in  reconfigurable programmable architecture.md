---
layout: post
title: An Application of nano-crossbar in  reconfigurable programmable architecture
date: 2021-7-05
categories: Research
tags: [Research, Course]
description: 
---



# An Application of nano-crossbar in  reconfigurable programmable architecture  

Rui Xie, Undergraduate *Student, Southern University of Science and Technology*  

NOTE: This is a abstract of COURSE Nano electronics

> ***Abstract*— The exponential (Moore's Law) progress of CMOS technology is mainly achieved through scaling, and its development lasted nearly half a century. However, this progress faces rapidly increasing challenges. One significance is that the main CMOS silicon MOSFET has at least one critical dimension defined by photolithography and scaling down will cause the change of its characteristics to increase exponentially. At the same time, with affordable equipment costs and acceptable patterning speeds, photolithography used in CMOS manufacturing can hardly provide the necessary improvements in critical dimension accuracy. This paper will present a contemporary reconfigurable computing architecture based on nano-crossbar arrays, discussing whose prospects and challenges, called CMOL (Complementary Metal Oxide Semiconductor MOLecular) FPGA, a digital architecture combining a semiconductor transistor stack and two levels of parallel nanowires, and a molecular-level nanodevice is formed between the nanowires between each intersection.**
>
> ***Key words*—CMOL, nano-crossbar, algorithm, hybrid circuit**

 



# I.   INTRODUCTION

CMOL (Complementary Metal Oxide Semiconductor MOLecular) circuit is a new type of nano circuit structure formed by combining traditional CMOS technology with nanowires and molecular devices. It not only maintains the rich logic functions of conventional CMOS technology, but also has the advantages of high integration of nano devices. This technology was proposed by Dmitri B Strukov and Konstantin K Likharev. Under the increasingly severe challenges of Moore's Law, CMOL technology is considered to be one of the most promising alternatives to traditional CMOS technologies.



# II.   Basic Structure And Ideas

The hybrid CMOS/nanoelectronics circuits, as shown in the Figure 1, circuits can better solve the current circuit problems caused by the reduction of device size. This is different from focusing on circuit functions and requiring devices to have sub-nanometer precision and extremely precise integrated circuit wiring levels. This architecture stacks the ordinary CMOS chips with the bottom layer of the MOSFET (Metal Oxide Silicon Field Effect Transistor) and several wiring layers together adding a simple additional layer of nanoelectronics. As a result, some key functions of the circuit, such as signal recovery, can be handed over to the MOSFET subsystem, while the nano-level system can perform some other functions.

This device has two states, which can be shown on its I-V diagram (Figure 2). In the case of low-resistance conduction, ON state, the nanodevice can be regarded as a diode. The ON and OFF states of the device can be switched mutually by applying a voltage exceeding the threshold ![img](file:///C:/Users/cheng/AppData/Local/Temp/msohtmlclip1/01/clip_image002.gif). Appropriate application of voltage in the two cross points, around ![img](file:///C:/Users/cheng/AppData/Local/Temp/msohtmlclip1/01/clip_image004.gif), can uniquely address each cross-point device. For example, only turning on or off the program will generate a net voltage higher than the threshold voltage ![img](file:///C:/Users/cheng/AppData/Local/Temp/msohtmlclip1/01/clip_image002.gif)on the selected device, but not change the status of the other semi-selected devices only with one of the activated nanowires outstanding.

If the crossbar switch becomes smaller, compared to its chip size, then each nanowire on the switch boundary will be relatively wide, so it can be suitable for CMOS lines. The crossbar occupies most of the chip position in majority applications, so it is necessary to use the area-distributed interface CMOL to solve it. The contact connection between the CMOS subsystem and the nanowire is a vertical plug with a conical shape, also called a pin. What needs to be considered is whether the briefness of these vertical plug pins is sharp enough to keep the CMOL scaling beyond 10nm.

In the general CMOL method, there are two types of pins (showcased in red and blue for clarity, Figure 3), the red pins reach the lower nanowires and the blue pins reach the higher nanowire. The hybrid circuit using the CMOL interfaces does not require any alignment of the crossbar layer. Since the connection between these two subsystems is not perfect, some unique ones can also be connected normally. Therefore, in the manufacturing process, 100% interface yield can be achieved even if the technology lacks precise alignment for manufacturing (Figure 4). This is instrumental for integrated circuit manufacturing technology.

![图片19](https://cdn.jsdelivr.net/gh/Mi5sssss/blog_image@main/2021-07-05-An-Application-of-nano-crossbar-in-reconfigurable-programmable-architecture/图片19.19wqfoo52teo.png)

`Fig. 1. The general basic structure of CMOL.`

![图片20](https://cdn.jsdelivr.net/gh/Mi5sssss/blog_image@main/2021-07-05-An-Application-of-nano-crossbar-in-reconfigurable-programmable-architecture/图片20.2tyk23059xg0.png)

`Fig. 2. DC I-V curve of a two-terminal device with the resistive switch (also called latching switch or programmable diode) functionality – schematically.` 

 

![图片21](https://cdn.jsdelivr.net/gh/Mi5sssss/blog_image@main/2021-07-05-An-Application-of-nano-crossbar-in-reconfigurable-programmable-architecture/图片21.280hcnvwojvo.png)

`Fig. 3. CMOL interface: (a) schematic top view and (b)side view.`

 

![图片22](https://cdn.jsdelivr.net/gh/Mi5sssss/blog_image@main/2021-07-05-An-Application-of-nano-crossbar-in-reconfigurable-programmable-architecture/图片22.3gvs81hb78o0.png)

`Fig. 4. Results of shifts between the crossbar and the interface pin system in two possible directions. For clarity, the red and blue pins are shown much closer to each other than they may be in an actual circuit.`

# III.   Significance

When describing the performance indicators of integrated circuits, there are generally three considerations: the integration of the circuit (area of the circuit), the operating speed (delay) of the circuit, and the power consumption of the circuit.

## A.   Area of the circuit

The integration of CMOL circuits can be showcased by average amount of transistors in unit area, saying, average area of one transistor occupied. When estimating the average area occupied by CMOL circuits, the area occupied by auxiliary circuits such as buffer circuits and peripheral logic function circuits are ignored, and the area occupied by the underlying CMOS unit is mainly calculated. Therefore, the CMOS circuit area is related to the area of each CMOS unit on the bottom layer and the average utilization of CMOS units.

The smaller the minimum feature size used by the underlying CMOS, the higher the average utilization of the CMOS unit, the smaller the area occupied by the circuit, that is, the higher the integration of the circuit.

## B.   Delay

The speed of integrated circuits is one of the important indicators of integrated circuit performance research. The study of time delay in integrated circuits includes the time delay of logic gate devices and the time delay of interconnection lines. In the CMOL circuits, it is necessary to study the time delay of the bottom CMOS unit and the time delay of the upper interconnection nanowires.

## C.   Power consumption

The power consumption of integrated circuits includes static power consumption and dynamic power consumption.

The static power consumption in the CMOL circuit is mainly the power consumption caused during the molecular connection between the two layers of nanowires, that is, the power consumption of the molecular device in the closed state and the leakage current power consumption in the off state, and the leakage of the underlying CMOS unit. 

The dynamic power consumption is mainly the additional power consumption produced by the CMOS unit transitioning between two steady states.

# IV.   Defects and challenges

There are some challenges in nowadays CMOL technology needed to be overcome.

## A.   Fault tolerance of CMOL circuit

In order to design a reliable digital system using CMOL circuits, fault-tolerant technology must be employed to overcome the untrustworthiness caused by errors. The mainstream fault-tolerant research on the module includes extraction of the defect map and guides of the mapper to complete the defect-free mapping, effective reconfigurable algorithm completing the reconstruction, the errors distribution model.

## B.   Cell mapping of CMOL circuit

There are two traditional fault-tolerant mapping methods for the PLA (Programmable logic array) structure of the nano-wire rule. One is to find the largest non-defective sub-array in a defective nano-array, and directly map it in the non-defective sub-array. The other method is to use certain algorithms to effectively avoid defects to achieve logic circuit mapping, such as the matching problem and the embedding problem of the bipartite graph, and so on. However, the nanowires of CMOL circuits are not periodic, which leads to certain connection domain constraints, and the difficulty of circuit mapping increases exponentially.

The CMOL cell mapping is usually divided into two steps. The first is the initial cell mapping that does not consider the defects of the circuit array, and the second is the cell fault-tolerant mapping that avoids defects based on the information of the circuit defects. Likharev proposed to use loop iteration to avoid defects. This method can only solve medium-scale circuits. Later, Arafeh proposed to use simulated evolutionary algorithm to increase the scale of the solution, reducing the speed of the algorithm, however.

In order to design a reliable digital system using CMOL circuits, fault-tolerant technology must be used to overcome the unreliability caused by errors. The current mainstream research directions include how to extract defect maps and guide the mapper to complete defect-free mapping; which effective reconfigurable algorithm to use to complete the reconstruction; and calculate the error distribution model.

In short, in order to make nano-hybrid circuits practical, how to tolerate faults is an inevitable research step. Inventing credible devices, finding suitable materials and then developing design tools will facilitate the industrialization of nanotechnology.

# V.   Conclusion

 

The integration level of the CMOL circuit is an order of magnitude higher than that of the current CMOS circuit, so the area is no longer a bottleneck restricting the development of integrated circuits.

According to the development trend of Moore's Law, in the next few years, the production process of integrated circuits will be less than 5 nanometers. This has brought unprecedented challenges to the production, integration, and computing capabilities of integrated circuits. The cost of developing precise lithography technology for nanotechnology is extortionate. The quantum effect of the microscopic world destroys the integrity of circuit signal transmission. Therefore, researchers have proposed a nanohybrid circuit that combines CMOS technology with nanowires and devices. Alternatives to continue singing Moore's Law. CMOL is one of the representatives. It has high integration density and super computing power and has reasonable nano-level wiring and micro-level CMOS interface, which is very promising for industrial production.

Some challenges were encountered in the development of CMOL circuits, two of which are listed above. Further research should fully consider the practical problem of fault tolerance.

When each CMOL circuit chip is produced, the distribution of device errors is not the same. How to quickly and effectively find defective devices from the huge period library and provide defect maps is very necessary and very challenging. The designed test circuit should be able to detect multiple types of errors at the same time instead of completing the test for only one type of error.

In commercial EDA (electronic design automation) design tools, CMOL circuit layout and mapping technology is a very challenging project. This has important practical significance for the use of CMOL circuits.

 

# References

 

[1]   Arafeh, A. M., & Sait, S. M. (2015, March). Cells reconfiguration around defects in CMOS/nanofabric circuits using simulated evolution heuristic. In Sixteenth International Symposium on Quality Electronic Design (pp. 581-588). IEEE.

[2]   Chen, G., Song, X., & Hu, P. (2008). A theoretical investigation on CMOL FPGA cell assignment problem. IEEE transactions on nanotechnology, 8(3), 322-329.

[3]   Madhavan, A., Sherwood, T., & Strukov, D. B. (2018). High-Throughput Pattern Matching With CMOL FPGA Circuits: Case for Logic-in-Memory Computing. IEEE Transactions on Very Large Scale Integration (VLSI) Systems, 26(12), 2759-2772.

[4]   Nauenheim, C., Kugeler, C., Rudiger, A., Waser, R., Flocke, A., & Noll, T. G. (2008, August). Nano-crossbar arrays for nonvolatile resistive RAM (RRAM) applications. In 2008 8th IEEE Conference on Nanotechnology (pp. 464-467). IEEE.

[5]   Ning, S., & Luo, J. (2019). Demonstration and Understanding of Nano-RAM Novel One-Time Programmable Memory Application. IEEE Transactions on Electron Devices, 66(5), 2179-2185.

[6]   Owlia, H., Keshavarzi, P., & Rezai, A. (2014). A novel digital logic implementation approach on nanocrossbar arrays using memristor-based multiplexers. Microelectronics journal, 45(6), 597-603.

[7]   Strukov, D. B., & Likharev, K. K. (2005). CMOL FPGA: a reconfigurable architecture for hybrid digital circuits with two-terminal nanodevices. Nanotechnology, 16(6), 888.

[8]   Strukov, D. B., Likharev, K. K., & Waser, R. (2012). Reconfigurable nano-crossbar architectures. Nanoelectronics and information technology, 543-562.

[9]   Vourkas, I., & Sirakoulis, G. C. (2014). Nano-crossbar memories comprising parallel/serial complementary memristive switches. BioNanoScience, 4(2), 166-179.

 

 



------

 