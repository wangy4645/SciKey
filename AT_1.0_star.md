# AT命令文档 - 1.0版本星形网络

#### 1  **AT^DACS:** **接入状态**

| **Command** | **Possible** **response(s)**     |
| ----------- | -------------------------------- |
| AT^DACS=<n> |                                  |
| AT^DACS?    | ^DACS:  <n>,<state>              |
| AT^DACS=?   | ^DACS: (list  of supported <n>s) |

 **Description** 

执行命令用于设置**^DACSI:** **<state>**上报的开关状态，开机初始默认关闭，设置开启时会将 当前状态做一次上报。主动上报开启时，接入节点在接入成功后主动上报接入状态指示；中 心节点开机成功后，就可视为接入成功，在确定中心节点类型后，再上报接入状态。

查询命令用于查询当前上报开关状态以及当前接入状态。

测试命令用于测试该命令是否支持，以及查询<n>参数的取值范围。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<n>: integer type, 表示主动上报的开关状态 

0:  关闭

1:  开启

2 ： 查询当前信息

<state>: integer type, 表示接入状态

 0:  未接入

1:  已接入

**Example**

```
AT^DACS=1<CR><LF>
<CR><LF>^DACSI: 0<CR><LF>
<CR><LF>OK<CR><LF>
<CR><LF>^DACSI: 1<CR><LF>
AT^DACS?<CR><LF>
<CR><LF>^DACS: 1,1<CR><LF>
<CR><LF>OK<CR><LF> AT^DACS=?<CR><LF>
<CR><LF>^DACS: (0-1)<CR><LF> <CR><LF>OK<CR><LF>
```

#### 2  **AT^DRPC:** **连接态无线参数实时生效配置**

| **Command**                          | **Possible** **response(s)**                                 |
| ------------------------------------ | ------------------------------------------------------------ |
| AT^DRPC=<freq>,<bandwidth>,<po  wer> |                                                              |
| AT^DRPC?                             | ^DRPC:  <freq>,<bandwidth>,<power>                           |
| AT^DRPC=?                            | ^DRPC: (list  of supported <freq>s),  (list  of supported <bandwidth>s) |

 **Description**

执行命令用于接入状态下的参数设置并保存到 NVRAM。 查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

 

**Defined** **values**

<freq>: integer type, 表示频点频率，单位 100KHz，范围 （8060-8259,14279-14679,24015-24814）

<bandwidth>: integer type, 表示带宽

0: 1.4M 1: 3M

2: 5M 3: 10M

4: 15M （不支持）

5: 20M        

<power>:“integer“ type, 表示中心节点的固定功率，单位 dBm，范围“-40“到“40 ，同时若超过终端支持最大值，以终端支持最大值为准。

**Example**

```
AT^DRPC=24415,1, ”27”<CR><LF> <CR><LF>OK<CR><LF>
AT^DRPC?<CR><LF>
<CR><LF>^DRPC: 24415,1, ”27”<CR><LF>
<CR><LF>OK<CR><LF>
AT^DRPC=?<CR><LF>
<CR><LF>^DRPC: (8060-8259,14279-14679,24015-24814) ,(0-5)<CR><LF>
<CR><LF>OK<CR><LF>
```

####  3  **AT^DRPS:** **非连接态无线参数配置**

| **Command**                          | **Possible** **response(s)**                                 |
| ------------------------------------ | ------------------------------------------------------------ |
| AT^DRPS=<freq>,<bandwidth>,<po  wer> |                                                              |
| AT^DRPS?                             | ^DRPS:  <freq>,<bandwidth>,<power>                           |
| AT^DRPS=?                            | ^DRPS: (list  of supported <freq>s),  (list  of supported <bandwidth>s |

 **Description**

执行命令用于进行参数保存到 NVRAM，保存后下电并重新开机生效。 查询命令用于查询当前 NVRAM 中参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<freq>: integer type, 表示频点频率，单位 100KHz，范围 （8060-8259,14279-14679,24015-24814）

<bandwidth>: integer type, 表示带宽

0: 1.4M 1: 3M

2: 5M 3: 10M

4: 15M (不支持) 5: 20M

<power>:“integer“ type, 表示中心节点的固定功率，单位 dBm，范围“-40“到“40“ ， 同时若超过终端支持最大值，以终端支持最大值为准。

**Example**

```
AT^DRPS=24415,1, ”27 ”<CR><LF> <CR><LF>OK<CR><LF>
AT^DRPS?<CR><LF>
<CR><LF>^DRPS: 24415,1, ”27 ”<CR><LF>
<CR><LF>OK<CR><LF>
AT^DRPS=?<CR><LF>
<CR><LF>^DRPS: (8060-8259,14279-14679,24015-24814),(0-5) <CR><LF>
<CR><LF>OK<CR><LF>
```

####  4  **AT^DSSMTP:** **从节点最大发射功率配置**

| **Command**       | **Possible** **response(s)**         |
| ----------------- | ------------------------------------ |
| AT^DSSMTP=<power> |                                      |
| AT^DSSMTP?        | ^DSSMTP:  <freq>,<bandwidth>,<power> |
| AT^DSSMTP=?       |                                      |

 **Description**

执行命令用于进行参数保存到 NVRAM，保存后下电并重新开机生效。 查询命令用于查询当前 NVRAM 中参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<power>:“integer“ type, 从节点最大发射功率，单位 dBm，范围“-40“到“40“ ，同 时若超过终端支持最大值，以终端支持最大值为准。

**Example**

```
AT^DSSMTP=“-10 ”<CR><LF> <CR><LF>OK<CR><LF>
AT^DSSMTP?<CR><LF>
<CR><LF> ”-10 ”<CR><LF> <CR><LF>OK<CR><LF>
AT^DSSMTP=?<CR><LF> <CR><LF>OK<CR><LF>
```

####  5  **AT^DRPR:** **无线参数上报**

| **Command** | **Possible** **response(s)**    |
| ----------- | ------------------------------- |
| AT^DRPR=<n> |                                 |
| AT^DRPR?    | ^DRPR: <n>                      |
| AT^DRPR=?   | ^DRPR: (list of supported <n>s) |

**Description**

执行命令用于设置本机无线参数上报**^DRPRI:**

**<index>,<earfcn>,<cell_id>,<rssi>****,<pathloss>,<rsrp>,<rsrq>,<snr>,<distance>,<t**

**x_power>,<dl_throughput_total_tbs>,<u****l_thrpughput_total_tbs>,<dlsch_tb_error_p**

**er>,<mcs>,<rb_num>,<wide_cqi>,<** **d****lsch_tb_error_per_total>,<** **Max_Snr>,<**

**Min_Snr>,<** **dl_total_tbs** **g** **rnti** **>**的开关状态，开机初始默认关闭。该开关只在本机作 为接入节点时有效；对于中心节点即使开关打开也不会发生主动上报。

查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<n>: integer type, 表示主动上报的开关状态

0:  关闭 1:  开启

2 ： 查询当前信息

<index>: integer type, 表示端口索引号 1:  端口 1

2:  端口 2

<earfcn>: integer type, 测量结果的频点信息 <cell_id>: integer type, 测量结果的小区信息

<rssi>: string type, RSSI 测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSSI 测量值

"+32767":   无效值

<pathloss>: integer type, 路损值,dBm

0 to 191:  路损值

32767:   无效值

<rsrp>: string type, RSRP 测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSRP 测量值

"+32767":   无效值

<rsrq>: string type, RSRQ 测量值,dBm,格式为"±value"(除"0"以外)，实际值需要除以10 处理

"-196" to "-30":  RSRQ 测量值

"+32767":   无效值

<snr>: string type,SNR 测量值. 格式为"±value"(除"0"以外)

"-50" to "+50":  SNR 测量值

"+32767":   无效值

< distance >: integer type, 与对端节点距离, 单位为米，取值范围[0, 5000] < tx_power >:string type，传输功率，单位 dBm, 格式为"±value"(除"0"以外)

"-50" to "+50": 传输功率 "+32767":   无效值

< dl_throughput_total_tbs >:integer type, 下行吞吐量信息, 上报周期内 TB size 总和， 单位 Byte，范围[0,12000000]

< ul_thrpughput_total_tbs >: integer type, 上行吞吐量信息, 上报周期内 TB size 总 和，单位 Byte，范围[0,12000000]

< dlsch_tb_error_per >:integer type, 上报周期内误码百分比，范围[0,100]

<mcs>: MCS, 取值范围[0,29]

<rb_num>: RB 数量，取值范围[6,100] <wide_cqi>:宽带 CQI，取值范围[1,15]

<dlsch_tb_error_per_total>:进入连接态之后上报总体误码百分比，范围 [0,100]

< Max_Snr>:10000ms 内的最大 snr,取值范围[-40,40]

< Min_Snr>:10000ms 内的最小 snr, 取值范围[-40,40]

<dl_total_tbs g rnti>: integer type, 灌组播包的 total_tbsize

**Example**

```
AT^DRPR=1<CR><LF> <CR><LF>OK<CR><LF> AT^DRPR?<CR><LF>
<CR><LF>^DRPR: 1<CR><LF> <CR><LF>OK<CR><LF>
<CR><LF>^DRPRI:
1,1000,16,"-46",20,"-60","-195","0",4000,"-36",10000000,5000000,10,15,3,15,
50,"+30","-25",15000<CR><LF>
<CR><LF>^DRPRI:
2,1000,16,"-106",115,"-100","-194","+20",4000,"-36",10000000,5000000,10,15,3,15,
50,"+35","-30",15000<CR><LF>AT^DRPR=?<CR><LF>
<CR><LF>^DRPR: (0-1)<CR><LF>
<CR><LF>OK<CR><LF>
```

####  6  **AT^DAPR:** **所有接入节点无线参数上报**

| **Command** | **Possible** **response(s)**     |
| ----------- | -------------------------------- |
| AT^DAPR=<n> |                                  |
| AT^DAPR?    | ^DAPR: <n>                       |
| AT^DAPR=?   | ^DAPR: (list  of supported <n>s) |

 **Description**

执行命令用于中心节点设置上报已接入节点无线参数**^DAPRI:** **<IPv6**

**address>,<index>,<rssi>,<pathloss>,<r****srp>,<rsrq>,<snr>,<distance>,<tx_power>,<** **dl_throughput_total_tbs>,<ul_throughput_total_tbs>,<dlsch_tb_error_per>,<dlsch** **_tb_error_per_total>,<Max_Snr>,<Min_Snr>,<dl_total_tbs** **g** **rnti>**的开关状态，开机 初始默认关闭。

查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<n>: integer type, 表示主动上报的开关状态

 0:  关闭

1:  开启

2 ： 查询当前信息

<IPv6 address>: string type, 已接入节点的 IP 地址，由 16 组数字组成 (0-255)，每组 数字间以 ’. ’号隔开，格式为:

a1.a2.a3.a4.a5.a6.aa8.a9.a10.a11.a12.a13.a14.a15.a16 <index>: integer type, 表示端口索引号

1:  端口 1 2:  端口 2

<rssi>: string type, RSSI 测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSSI 测量值

"+32767":   无效值

<pathloss>: integer type, 路损值,dBm

0 to 191:  路损值

32767:   无效值

<rsrp>: string type, RSRP 测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSRP 测量值 

"+32767":   无效值

<rsrq>: string type, RSRQ 测量值,dBm,格式为"±value"(除"0"以外)，实际值需要除以

10 处理

"-196" to "-30":  RSRQ 测量值

"+32767":   无效值

<snr>: string type,SNR 测量值. 格式为"±value"(除"0"以外)

"-50" to "+50":  SNR 测量值

"+32767":   无效值

< distance >: integer type, 与对端节点距离, 单位为米，取值范围[0, 5000] < tx_power >:string type，传输功率，单位 dBm, 格式为"±value"(除"0"以外)

"-50" to "+50": 传输功率 "+32767":   无效值

< dl_throughput_total_tbs >:integer type, 下行吞吐量信息, 上报周期内 TB size 总和， 单位 Byte，范围[0,12000000]

< ul_thrpughput_total_tbs >: integer type, 上行吞吐量信息, 上报周期内 TB size 总 和，单位 Byte，范围[0,12000000]

< dlsch_tb_error_per >:integer type, 上报周期内误码百分比，范围[0,100]

<mcs>: MCS, 取值范围[0,29]

<rb_num>: RB 数量，取值范围[6,100] <wide_cqi>:宽带 CQI，取值范围[1,15]

<dlsch_tb_error_per_total>:进入连接态之后上报总体误码百分比，范围 [0,100]

< Max_Snr>:10000ms 内的最大 snr,取值范围[-40,40]

< Min_Snr>:10000ms 内的最小 snr, 取值范围[-40,40]

<dl_total_tbs g rnti>: integer type, 灌组播包的 total_tbsize 

**Example**

```
AT^DAPR=1<CR><LF> <CR><LF>OK<CR><LF> AT^DAPR?<CR><LF>
<CR><LF>^DAPR: 1<CR><LF> <CR><LF>OK<CR><LF>
<CR><LF>^DAPRI:
"1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.203",1,"-46",20,"-60","-195","0",4000,"-36",10000000,5000000,10,15,3,15, 50,"+30","-25",16000<CR><LF>
<CR><LF>^DAPRI:
"1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.203",2,"-106",115,"-100","-194","+20",4000,"-36",10000000,5000000,10,15,3,15,50,"+35","-30",16000<CR><LF>AT^DAPR=?<CR><LF>
<CR><LF>^DAPR: (0-1)<CR><LF>
<CR><LF>OK<CR><LF>
```

####  7  **AT^DAOCNDI:** **用户频段配置**

| **Command**              | **Possible** **response(s)** |
| ------------------------ | ---------------------------- |
| AT^DAOCNDI=<band_bitmap> |                              |
| AT^DAOCNDI?              | ^DAOCNDI:  <band_bitmap>     |
| AT^DAOCNDI=?             |                              |

 **Description**

执行命令用于设置自组网通信设备工作频段信息，设置后重新上电开机生效。

查询命令用于查询自组网通信设备工作频段信息。 测试命令用于测试该命令是否支持。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<band_bitmap>: string type(without double quotes),in hexadecimal format, the

rightmost bit is the least significant bit (LSB/bit0). Bit0:  800M 频段

Bit2:  1.4G 频段

Bit3:  2.4G 频段

**Example**

```
AT^DAOCNDI=0D<CR><LF>// Set band as 800M/1.4G/2.4G <CR><LF>OK<CR><LF>
AT^DAOCNDI=01<CR><LF>// Set band as 800M <CR><LF>OK<CR><LF>
AT^DAOCNDI?<CR><LF>
<CR><LF>^DAOCNDI: 0D<CR><LF>
<CR><LF>OK<CR><LF>
AT^DAOCNDI=?<CR><LF>
<CR><LF>OK<CR><LF>
```

####  8  **AT^DDTC:** **设备类型配置**

| **Command**    | **Possible** **response(s)**      |
| -------------- | --------------------------------- |
| AT^DDTC=<type> |                                   |
| AT^DDTC?       | ^DDTC:<type>,<working type>       |
| AT^DDTC=?      | ^DDTC:(list of supported <type>s) |

**Description**

执行命令用于设置自组网通信设备类型，需要在（+CFUN=1）开机之前设置，+CFUN=1 开机 之后生效。当终端工作设备类型确定时，主动上报^DDTCI:<type>,**<**working type **>**

查询命令用于查询自组网通信设备类型信息。 测试命令用于测试该命令是否支持。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed 

**Defined** **values**

<type>: integer type, 表示设备类型 

0:  自动

1:  中心节点 2:  接入节点

<working type>: integer type, 表示当前实际工作设备类型 

0:  自动

1:  中心节点 2:  接入节点

**Example** 

```
AT^DDTC=0<CR><LF> <CR><LF>OK<CR><LF> AT^DDTC?<CR><LF>
<CR><LF>^DDTC: 0,0<CR><LF> <CR><LF>OK<CR><LF>
<CR><LF>^DDTCI: 0,1<CR><LF>
AT^DDTC=?<CR><LF>
<CR><LF>^DDTC: (0-2)<CR><LF>
<CR><LF>OK<CR><LF>
```

#### 9  **AT^DAPI:** **接入秘钥配置**

| **Command**           | **Possible** **response(s)** |
| --------------------- | ---------------------------- |
| AT^DAPI=<password_id> |                              |
| AT^DAPI?              | ^DAPI: <password_id>         |
| AT^DAPI=?             |                              |

 **Description**

设置命令用于设置自组网设备 PASSWORD ID。重新上电开机生效。 查询命令用于查询自组网设备 PASSWORD ID。

测试命令用于测试该命令是否支持。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<password_id>: string type, in HEX format, 数据最长支持 32 字节（HEX 字符串 64 个 字符）

**Example**

```
AT^DAPI=”30313233FBFA”<CR><LF> <CR><LF>OK<CR><LF>
AT^DAPI?<CR><LF>
<CR><LF>^DAPI: “30313233FBFA”<CR><LF>
<CR><LF>OK<CR><LF>
AT^DAPI=?<CR><LF>
<CR><LF>OK<CR><LF>
```

#### 10 **AT^DIPAN** **:** **所有接入节点** **IP** **地址列表查询**

| **Command** | **Possible** **response(s)**                                 |
| ----------- | ------------------------------------------------------------ |
| AT^DIPAN    | ^DIPAN:  <m>[,<IP Type>,<IP address_1>[,IP  address_2>,...[,<IP  address_m>]]] |
| AT^DIPAN=?  |                                                              |

 **Description**

执行命令用于查询当前可达节点信息，当前可达节点信息发生改变时，modem 主动上报 ^DIPANI: <m>[,<IP Type>,<IP address_1>[,IP address_2>,...[,<IP address_m>]]] 测试命令用于测试该命令是否支持。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Unsolicited** **result** **code**

^DIPANI: <m>[,<IP Type>,<IP address_1>[,IP address_2>,...[,<IP address_m>]]]

**Defined** **values**

<m>: integer type, 表示可达结点个数

<IP type>: integer type, 表示 IP 地址类型 0:  IPV4

1:  IPV6

<IP address>: string type, 可达结点的 IP 地址，如果<IP type>为 IPV6，<IP address> 由 16 组数字组成 (0-255)，每组数字间以 ’. ’号隔开，格式为:

a1.a2.a3.a4.a5.a6.aa8.a9.a10.a11.a12.a13.a14.a15.a16; 如果<IP type>为 IPV4，<IP address>由 4 组数字组成 (0-255)，每组数字间以 ’. ’号隔开，格式为: a1.a2.a3.a4

**Example**

```
AT^DIPAN<CR><LF>
<CR><LF>^DIPAN: 0<CR><LF>
<CR><LF>OK<CR><LF>
<CR><LF>^DIPANI: 1, 1,"1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.203"<><CR><LF>
<CR><LF>^DIPANI: 2,1, "1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.203",
"1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.204"<><CR><LF>
AT^DIPAN<CR><LF>
<CR><LF>^DIPAN: 2, 1,"1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.203",
"1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.204"<CR><LF>
<CR><LF>OK<CR><LF>
AT^DIPAN=?<CR><LF>
<CR><LF>OK<CR><LF>
```

#### 11 **AT^DSTC:** **TDD** **上下行配比配置 **

| **Command**    | **Possible** **response(s)**        |
| -------------- | ----------------------------------- |
| AT^DSTC=<conf> |                                     |
| AT^DSTC?       | ^DSTC: <conf>                       |
| AT^DSTC=?      | ^DSTC: (list  of supported <conf>s) |

**Description**

执行命令用于进行参数设置，设置后下电重新开机生效。 查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<conf>: integer type, 表示 TDD config 设置 

0: config0 (2D3U)

1: config1 (3D2U) (远距离模式不支持)

2: config2 (4D1U) (远距离模式不支持)

3：config3 （1D4U）

**Example**

```
AT^DSTC=0<CR><LF> <CR><LF>OK<CR><LF> AT^DSTC?<CR><LF>
<CR><LF>^DSTC:0<CR><LF> <CR><LF>OK<CR><LF>
AT^DSTC=?<CR><LF>
<CR><LF>^DSTC: (0-3)<CR><LF> <CR><LF>OK<CR><LF>
```

#### 12 **AT^DUBR:** **COM-UART** **波特率****配置**

| **Command**    | **Possible** **response(s)**        |
| -------------- | ----------------------------------- |
| AT^DUBR=<rate> |                                     |
| AT^DUBR?       | ^DUBR: <rate>                       |
| AT^DUBR=?      | ^DUBR: (list  of supported <rate>s) |

 **Description**

执行命令用于设置 COM-UART 口波特率参数，设置后下电重新开机生效。 查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<rate>: integer type, 表示 UART 口波特率参数，取值范围如下： 1200: 1200 byte/s

2400: 2400 byte/s

4800: 4800 byte/s

9600: 9600 byte/s

19200: 19200 byte/s

28800: 28800 byte/s

38400: 38400 byte/s

57600: 57600 byte/s

115200: 115200 byte/s

**Example**

```
AT^DUBR=57600<CR> <CR><LF>OK<CR><LF> AT^DUBR?<CR><LF>
<CR><LF>^DUBR: 57600<CR><LF>
<CR><LF>OK<CR><LF>
AT^DUBR=?<CR>
<CR><LF>^DUBR: (1200,2400,4800,9600,19200,28800,38400,57600, 115200) <CR><LF> <CR><LF>OK<CR><LF>
```

#### 13 **AT^DCIAC** **:** **加密算法选择配置**

| **Command**      | **Possible** **response(s)**          |
| ---------------- | ------------------------------------- |
| AT^DCIAC=<arith> |                                       |
| AT^DCIAC?        | ^DCIAC: <arith>                       |
| AT^DCIAC=?       | ^DCIAC: (list  of supported <arith>s) |

 **Description**

执行命令用于设置加密和完保算法，设置后下电重新开机生效。 查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values** 

<arith>: integer type, 表示加密和完保算法，取值范围如下： 0: none ciphering and integrality

1: SNOW3G 2: AES

3: ZUC

**Example** 

```
AT^DCIAC=2<CR>
<CR><LF>OK<CR><LF> AT^DCIAC?<CR><LF>
<CR><LF>^DCIAC: 2<CR><LF>
<CR><LF>OK<CR><LF>
AT^DCIAC=?<CR>
<CR><LF>^DCIAC: (0-3) <CR><LF> <CR><LF>OK<CR><LF>
```

####  14 **AT^DFHC:** **跳频开关控制**

| **Command** | **Possible** **response(s)**     |
| ----------- | -------------------------------- |
| AT^DFHC=<n> |                                  |
| AT^DFHC?    | ^DFHC: <n>                       |
| AT^DFHC=?   | ^DFHC: (list  of supported <n>s) |

 **Description**

执行命令用于进行跳频参数设置，设置后下电重新开机生效。 查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<n>: integer type, 表示跳频功能设置 0: 关闭跳频功能

1: 打开跳频功能

**Example**

```
AT^DFHC=0<CR><LF> <CR><LF>OK<CR><LF> AT^DFHC?<CR><LF>
<CR><LF>^DFHC:0<CR><LF> <CR><LF>OK<CR><LF>
AT^DFHC=?<CR><LF>
<CR><LF>^DFHC: (0-1)<CR><LF> <CR><LF>OK<CR><LF>
```

####  15 **AT^ELFUN：** **ELog** **功能配置**

| **Command**     | **Possible** **response(s)**          |
| --------------- | ------------------------------------- |
| AT^ELFUN=<mode> |                                       |
| AT^ELFUN?       | ^ELFUN : <mode>                       |
| AT^ELFUN=?      | ^ELFUN : (list  of supported <mode>s) |

 **Description**

执行命令用于开关 Elog 模块。

查询命令用于查询 Elog 开关状态。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

| **Response**                                    | **result**                  |
| ----------------------------------------------- | --------------------------- |
| **OK**                                          | Successful                  |
| **ERROR** **or**  **+CME** **ERROR:** **<err>** | Command  performing  failed |

 **Defined** **values**

< mode >: integer type

0：Close ELOG module

1：Open ELOG module

 **Example**

```
AT^ELFUN=0<CR><LF> <CR><LF>OK<CR><LF> AT^ELFUN?<CR><LF>
<CR><LF>^ ELFUN:0<CR><LF> <CR><LF>OK<CR><LF>
AT^ELFUN=?<CR><LF>
<CR><LF>^ELFUN: (0-1)<CR><LF>
<CR><LF>OK<CR><LF>
```

####  16 **AT^APLFUN:APLog** **功能配置**

| **Command**    | **Possible response(s)**            |
| -------------- | ----------------------------------- |
| AT^APLFUN =<n> |                                     |
| AT^APLFUN?     | ^APLFUN : <n>                       |
| AT^APLFUN   =? | ^APLFUN : (list of supported  <n>s) |

 **Description**

执行命令用于开关 AP LOG 功能。

 **Final result** **code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

 <n>: integer type, 表示快速跳频功能设置 0: 关闭 AP LOG 功能

1: 打开 AP LOG 功能

**Example**

```
AT^APLFUN=0<CR><LF> <CR><LF>OK<CR><LF>  AT^APLFUN?<CR><LF>
<CR><LF>^APLFUN:0<CR><LF>
<CR><LF>OK<CR><LF>  AT^ APLFUN=?<CR><LF>
<CR><LF>^APLFUN(0-1)<CR><LF> <CR><LF>OK<CR><LF>
```

####  17 **AT^NETIFCFG：** **设备** **IP** **地址****配置**

| Set command  AT^NETIFCFG   =<selif>,<master_ip address>[,<sub_ip addresss>] | Set command is used to set the network card interface type  and  primary  ip  address  and  slave  ip address.  select current network card interface.  Response: OK  Iferror is related  to ME functionality: +CME  ERROR: 100  Parameter:  < selif >:  integer of the selected network  card type 0:保留  1:保留  2:设置模块 IP 地址  <  master_ip address >  string of network card interface’s ip  address, 模块 IP 地址  < sub_ip addresss > string of network card interface’s ip  address，从机 IP 地址，保留未使用 |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| Read command  AT^NETIFCFG?                                   | Response:  ^NETIFCFG :<0  >,<ip_address>,<ip_address>  ^NETIFCFG :<1 >,<ip_address>,<ip_address>  ^NETIFCFG :<2  >,<ip_address>,<ip_address>  OK |
|                                                              | Parameter  See set command                                   |
| Test command  AT^NETIFCFG =?                                 | Response:  ^NETIFCFG: (list of supported < selif >s) OK  Parameter  See set command     **Example**     ^NETIFCFG:(0,1,2) OK |
| Reference                                                    |                                                              |
| Note                                                         |                                                              |

####  18 **AT^DGMR：** **版本查询**

| **Command** | **Possible** **response(s)** |
| ----------- | ---------------------------- |
| AT^ DGMR?   | ^DGMR:<Version Number>       |

**Description**

查询命令用于查询当前模块的版本信息。

| **Response**                                    | **result**                  |
| ----------------------------------------------- | --------------------------- |
| **OK**                                          | Successful                  |
| **ERROR** **or**  **+CME** **ERROR:** **<err>** | Command  performing  failed |

 **Example**

```
AT^DGMR?<CR><LF>
<CR><LF>^ DGMR: CX660X_1.20.00.R11 <CR><LF>
<CR><LF>OK<CR><LF>
```

####  19 **AT^POWERCTL：** **主动掉电重启开关**

| Set  Command  AT^POWERCTL=<value> | Set  command is used to  reboot os  Response:  OK  If  error is related to  ME  functionality:  +CME  ERROR: 100     Parameter:  <  value>: integer of the reboot  os,only  one value  1 |
| --------------------------------- | ------------------------------------------------------------ |
| Test Command   AT^POWERCTL=?      | Response:  ^POWERCTL: (list of supported <  vlaue >)  OK     Parameter  See set command Example  ^POWERCTL:1 OK |

 **Description**

执行命令用于模块重启。

| **Response**                                    | **result**                  |
| ----------------------------------------------- | --------------------------- |
| **OK**                                          | Successful                  |
| **ERROR** **or**  **+CME** **ERROR:** **<err>** | Command  performing  failed |

**Example**

```
AT^POWERCTL=1<CR><LF> <CR><LF>OK<CR><LF>
```

####  20 **AT^RCVR：** **版本** **OTA** **升级管理**

| Set command     AT^RCVR=<value>, <“IP”> | Set  command is used to control device  OTA  start     Response:  OK  If error is related to  ME functionality: +CME  ERROR: 100     Parameter:  <  value>: integer of the device  OTA start  <“IP”>:remote device ip address,if  <value> is 1,no  set  <”ip”>  0,”FFFF” : control  remote all device OTA  start  0,”xxx.xxx.xxx.xxx” :control remote in  one IP  device OTA start  1:control in usb connected devices OTA start |
| --------------------------------------- | ------------------------------------------------------------ |
| Read command  AT^RCVR?                  | Response: <value >   OK     Parameter  See set command       |
| Test command  AT^RCVR =?                | Response:  ^RCVR: (list  of supported < value >s)  OK     Parameter  See set command        **Example**  ^RCVR:(0,1) OK |
| Reference                               |                                                              |

 **Description**

执行命令用于模块 OTA 升级启动。

| **Response**                                    | **result**                  |
| ----------------------------------------------- | --------------------------- |
| **OK**                                          | Successful                  |
| **ERROR** **or**  **+CME** **ERROR:** **<err>** | Command  performing  failed |

 **Example**

```
AT^RCVR=0,”FFFF”<CR><LF> <CR><LF>OK<CR><LF>
```

####  21 **AT^DAMR：** **设备软件版本信息查询**

| Set command  AT^DAMR=<value>,<“IP”> | Set command  is used to get local or remote  devices soft version information  Response:  ^DAMR:"xxx  _xxx_xxx"  OK  If error is related to ME functionality: +CME  ERROR: 100     Parameter:  <  value>: integer of the get soft version  information  <“IP”> : remote device ip address,if  <value> is 1,no  set <“IP”>     0,xxx.xxx.xxx.xxx:  get remote in one IP  device soft version information  1:get in usb connected device soft version  information |
| ----------------------------------- | ------------------------------------------------------------ |
| Test command：  AT^DAMR=?           | Response:   ^DAMR: (list of supported <  value OK     Parameter  See set command        **Example**  ^DAMR:(0,1) OK |

**Description**

执行命令用于读取模块的版本号。

| **Response**                                    | **result**                  |
| ----------------------------------------------- | --------------------------- |
| **OK**                                          | Successful                  |
| **ERROR** **or**  **+CME** **ERROR:** **<err>** | Command  performing  failed |

**Example**

```
AT^DAMR=1<CR><LF>
<CR><LF>^DAMR: CX660X_1.20.00.R11 <CR><LF>
<CR><LF>OK<CR><LF>
```

####  22 **AT^DSONMCS:** **调制码率等级设****置.**

| **Command**                | **Possible** **response(s)**                                 |
| -------------------------- | ------------------------------------------------------------ |
| AT^DSONMCS=<Mode>,[,<Mcs>] |                                                              |
| AT^DSONMCS?                | ^DSONMCS:  <Mode>,<Mcs>                                      |
| AT^DSONMCS=?               | ^DSONMCS: (list  of supported  <Mode>s),(list  of supported <Mcs>s) |

 **Description**

设置命令用于设置 MCS 索引值开关以及索引值，若未开启，则不允许改变 MCS 值；若开 启 MCS 开关，允许设置 MCS 索引值，立即生效，且保存到 NVRAM 中，永久生效。默认开关为 关闭状态。

查询命令查询当前设置值。

测试命令用于测试该命令支持的设置值。 NOTE: 该指令只能在主节点下发

**Final** **result** **code**

**OK**

Successful.

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed.

**Defined** **values**

<Mode>: integer type, 表示 MCS 索引值功能设置，默认为不开启设置功能

0: 关闭设置功能 1: 打开设置功能

<Mcs>: integer type, 表示 MCS 索引值.取值范围为 0~27。默认值为 27

**Example**

```
AT^DSONMCS=1,5<CR><LF>
<CR><LF>OK<CR><LF>
AT^DSONMCS?<CR><LF>
<CR><LF>^DSONMCS:1, 5<CR><LF>
<CR><LF>OK<CR><LF>
AT^DSONMCS =?<CR><LF>
<CR><LF>^DSONMCS: (0-1),(0-27)<CR><LF> <CR><LF>OK<CR><LF>
```

####  23 **AT^DLF:工作频点锁定配置**

| **Command**                 | **Possible** **response(s)**                                 |
| --------------------------- | ------------------------------------------------------------ |
| AT^DLF=<lock_type>[,<freq>] |                                                              |
| AT^DLF?                     | ^DLF:  <lock_type>[,<freq>]                                  |
| AT^DLF=?                    | ^DLF:  (list  of  supported< ；   lock_type>s)， (list  of supported lock  <freq>s) |

 **Description**

执行命令用于控制用户设置锁频信息，设置值保存到 NVRAM 中，进出飞行生效。 查询命令用于查询当前 NVRAM 中参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final** **result** **code**

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<LockType >: integer type, 表示用户设置锁定指定频点开关设置 0: 不锁频或者解除已锁频点

1: 锁定指定频点

<Freq>:  integer  type,  表 示 频 点 频 率 ， 单 位  100KHz ， 范 围

（8060-8259,14279-14679,24015-248140） 

**Example**

```
AT^DLF=1,14350<CR><LF> <CR><LF>OK<CR><LF>
AT^DLF?<CR><LF>
<CR><LF>^DLF: 1, 14350<CR><LF> <CR><LF>OK<CR><LF>
AT^DLF=?<CR><LF>
<CR><LF>^ DLF: (0-1), (8060-8259,14279-14679,24015-24814)<CR><LF>
<CR><LF>OK<CR><LF>
```

####  24 **AT^DSONSBR:** **工作频段频点范围配置**

| **Command**                                                  | **Possible** **response(s)**                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| AT^DSONSBR=<band>,<earfcn_start>,<e  arfcn_end>[,<band>,<earfcn_start>,<  earfcn_end>[,<band>,<earfcn_start>,  <earfcn_end>]…] |                                                              |
| AT^DSONSBR?                                                  | ^DSONSBR:  <band>,<earfcn_start>,<earfcn_end>[,<band  >,<earfcn_start>,<earfcn_end>[,<band>,<ea  rfcn_start>,<earfcn_end>]…] |
| AT^DSONSBR=?                                                 | ^DSONSBR: <band>, (list of supported  <earfcn>s), <band>, (list of supported  <earfcn>s),… |

 **Description** 

执行命令用于配置各子频段的频点范围，保存到 NVRAM，进出飞行生效。 查询命令用于查询当前各子频段范围配置。

测试命令用于测试该命令是否支持，以及各子频段允许配置的频点范围。

**Final** **result** **code** 

**OK**

Successful

**ERROR** **or** **+CME** **ERROR:** **<err>**

Command performing failed

**Defined** **values**

<band>: integer type, 子频段编号 64: BAND64

65: BAND65

66: BAND66

<earfcn_start> : integer type, 起始频点号，取值范围与子频段相关，其取值必须不大于 <earfcn_end>

BAND64: 24015-24814

BAND65: 8060-8259

BAND66: 14279-14679

<earfcn_end>: integer type, 结束频点号，取值范围与子频段相关， 其取值不能小于 <earfcn_start>

BAND64: 24015-24814

BAND65: 8060-8259

BAND66: 14279-14679

**Example**

```
AT^DSONSBR=64,24020,24800,66,14280,14470<CR><LF>
<CR><LF>OK<CR><LF> AT^DSONSBR?<CR><LF>
<CR><LF>^DSONSBR: 64,24020,24800,66,14280,14470<CR><LF> <CR><LF>OK<CR><LF>
AT^DSONSBR=?<CR><LF>
<CR><LF>^DSONSBR: 64,(24015-24814),65,(8060-8259),66,(14279-14679), <CR><LF>
<CR><LF>OK<CR><LF>
```

####  25 **AT^DHCPSET：** **DHCP** **服务****开关配置**

| Set command  AT^DHCPSET=<mode> | Set  command is used to OPEN/CLOSE DHCP service。  执行命令用于设置 DHCP 的开关值 persist.sys.dhcp.mode     Response  OK  If error:  +CME  ERROR: 100     Parameter  <mode>: Integer 0：close  DHCP  1：open DHCP Server as Master node, Client as Slave  node  2：open DHCP Client as  Master node, Client as Slave  node  Example:  AT^DHCPSET=0<CR><LF>  //close DHCP  <CR><LF>OK<CR><LF>  AT^DHCPSET=1  //open DHCP Server-M, Client-S <CR><LF>OK<CR><LF>  AT^DHCPSET=2  //open DHCP Client-M, Client-S <CR><LF>OK<CR><LF> |
| ------------------------------ | ------------------------------------------------------------ |
| Read command  AT^DHCPSET？     | Response:  <CR><LF> ^DHCPSET: <n>  <CR><LF>OK  Parameter  See set command |
| Test command  AT^DHCPSET=？    | Response:  ^  DHCPSET: (list of supported <mode>s)  OK  Parameter  See set command  Example:  <CR><LF> ^DHCPSET: (1,2,3)  <CR><LF> |
| Note                           | **默认** **DHCP** **服务不启动，**  **允许用户配置自动获取** **IP** **或者手动方式配置** **IP** |

#### 26 **AT^DHDRSET：** **DHCP** **服务** **IP** **范围配置**

| Set command  AT^DHDRSET= ”value” | Set command is used to set DHCP IP range as DHCP Server。 执 行 命 令 用 于 设 置 DHCP 的 IP 范 围 值 persist.sys.dhcp.iprange     Response  OK  If error:  +CME  ERROR: 100     Parameter  <value>: string  DHCP_DEFAULT_RANGE：0.0.0.0:255.255.255.255 Others  Example:  AT^DHDRSET=”DHCP_DEFAULT_RANGE”<CR><LF>  //  DHCP_DEFAULT_RANGE :0.0.0.0:255.255.255.255  <CR><LF>OK<CR><LF>     AT^DHDRSET=”[192.168.1.11](192.168.1.11):[192.168.1.49](192.168.1.49)”<CR><LF> <CR><LF>OK<CR><LF> |
| -------------------------------- | ------------------------------------------------------------ |
| Read command  AT^DHDRSET？       | Response:  ^DHDRSET: “DHCP_DEFAULT_RANGE”  Parameter  See set command |
| Test command  AT^DHDRSET =？     | Response:  ^DHDRSET: (list  of supported <mode>s)  OK  Parameter  See set command  Example:  <CR><LF>  ^DHDRSET:  (0.0.0.0:255.255.255.255)  <CR><LF> |
| Note                             | **默认** **DHCP** **服务不启动，**  **用户配置自动获取** **IP** **时，DHCP** **Server** **按照配置** **IP** **地址范** **围进行指派。** |

####  27 **AT^RNDISCTL：** **USB** **RNDIS** **网卡使能开关配置**

| Set command  AT^RNDISCTL =<operation> | Set  command is used to enable(up) or  disable(down)  the rndis0 network card.     Response:  OK  If error is related to  ME functionality: +CME ERROR: 100     Parameter:  < operation >: string of operation on rndis0  network card.  down: 关闭 rndis0 up:  打开 rndis0 |
| ------------------------------------- | ------------------------------------------------------------ |
| Read command AT^RNDISCTL?             | Response:  ^RNDISCTL: down  ^RNDISCTL:  up     OK     Parameter  See set command |
| Test command  AT^RNDISCTL=?           | Response:  ^RNDISCTL: (down,up)     OK     Parameter  See set command |
| Reference                             |                                                              |
| Note                                  |                                                              |

#### 28 **AT^MACCFG：私有** **MAC** **地址配置**

| **Command**                           | **Possible response(s)**                                 |
| ------------------------------------- | -------------------------------------------------------- |
| AT^ MACCFG  =<selif>[,<mac addresss>] |                                                          |
| AT^ MACCFG?                           | ^MACCFG :<0 >,<mac_address>  ^MACCFG :<1 >,<mac_address> |
| AT^ MACCFG =?                         | ^ MACCFG: (list of supported < selif >s)                 |

 **Description**

执行命令用于进行设置MAC地址(需要注意的是设置AT^ MACCFG =0 后，需要手动重启系统)。

查询命令用于查询当前模块的mac地址。 

测试命令用于测试该命令是否支持， 以及查询参数的取值范围。

| **Response**                    | **result**                 |
| ------------------------------- | -------------------------- |
| **OK**                          | Successful                 |
| **ERROR or +CME ERROR:  <err>** | Command  performing failed |

 **Defined values**

< selif >: integer of default or configed by at command

 0:default mac address

1:at config mac address

[,<mac addresss>]: MAC address

如果< selif >是0 ，mac address不用设置 如果< selif >是1 ，mac address需要设置

**Example**

```
AT^ MACCFG =0
<CR><LF>OK<CR><LF>
AT^ MACCFG =1,“CA.01.00.00:1B:07”
<CR><LF>OK<CR><LF>  AT^ MACCFG?<CR><LF>
<CR><LF>^ MACCFG:1,“CA.01.00.00:1B:07”<CR><LF> <CR><LF>OK<CR><LF>
AT^ MACCFG =?<CR><LF>
<CR><LF>^ MACCFG: (0-1) ，[hex mac address]<CR><LF>
<CR><LF>OK<CR><LF>
```

####  29 **AT^UARTSEND：** **UART0** **通道发送** **IP** **数据配置**

| **Command**          | **Possible response(s)** |
| -------------------- | ------------------------ |
| AT^UARTSEND=”value ” |                          |

 **Description**

通过uart0的AT指令将数据发送到指定IP的设备中，会将整个AT指令作为整体全部发送， AT指

令的总长度不超过1024个字节。

| **Response**                    | **result**                 |
| ------------------------------- | -------------------------- |
| **OK**                          | Successful                 |
| **ERROR or +CME ERROR:  <err>** | Command  performing failed |

 **Defined values**

“value” : “ ip:test”

ip:remote ip address

test：data need to be sent

 **Example**

```
AT^UARTSEND=”[192.168.1.11](192.168.1.11):AABBCCDD”<CR><LF>
<CR><LF>OK<CR><LF>
AT^UARTSEND?<CR><LF>
<CR><LF>ERROR<CR><LF> AT^UARTSEND=?<CR><LF>
<CR><LF>ERROR<CR><LF>
```

