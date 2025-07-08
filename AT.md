 **6680模块API2.0** **--** **HTTP** **请求说明**

Request 说明：

POST /atservice.fcgi HTTP/1.1\r\n

[Expert Info (Chat/Sequence): POST /atservice.fcgi HTTP/1.1\r\n]

Request Method: POST

Request URI: /atservice.fcgi Request Version: HTTP/1.1

Media Type: content-type:; text/plain;

{"action":"sendcmd","AT":"at^dgmr?"}

{"action":"sendcmd","AT":"at^dgmr?"}为发送的参数，at^dgmr?为输入框中的 AT 命令

 

Response 说明：

HTTP/1.1 200 OK\r\n

[Expert Info (Chat/Sequence): HTTP/1.1 200 OK\r\n] Request Version: HTTP/1.1

Response Code: 200

[Status Code Description: OK]

Response Phrase: OK Media Type:

{"retcode":1, "response":{ "msg": \r\n

^DGMR:"版本号"\r\n \r\n

OK\r\n }}

上述为返回结果，字符串，数量和长度会根据输入命令返回的信息改变。



**附：** **AT** **指令集**

 

### 1 AT+CFUN:Set Phone Functionality



| **Command**                 | **Possible response(s)**                                     |
| --------------------------- | ------------------------------------------------------------ |
| **AT+CFUN=[<fun>[,<rst>]]** |                                                              |
| **AT+CFUN?**                | **+CFUN: <fun>**                                             |
| **AT+CFUN=?**               | **+CFUN: (list of supported <fun>s), (list of  supported <rst>s)** |

**Description**

执行命令用于Core Module 软关机/开机，实现进出飞行模式。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<fun>: integer type

  0:  minimum functionality(switch off).

  1:  full functionality(switch on).

**Example**

AT+CFUN=1<CR>

<CR><LF>OK<CR><LF>

AT+CFUN?<CR>

<CR><LF>+CFUN: 1<CR><LF>

<CR><LF>OK<CR><LF>

AT+CFUN=?<CR>

<CR><LF>+CFUN: (0..1)<CR><LF>

<CR><LF>OK<CR><LF>

 

### 2 AT^DACS: Access State

| **Command** | **Possible response(s)**        |
| ----------- | ------------------------------- |
| AT^DACS=<n> |                                 |
| AT^DACS?    | ^DACS: <n>,<state>              |
| AT^DACS=?   | ^DACS: (list of supported <n>s) |

**Description**

执行命令用于设置**^DACSI: <state>**上报的开关状态，开机初始默认关闭，设置开启时会将当前状态做一次上报。主动上报开启时，接入节点在接入成功后主动上报接入状态指示；中心节点开机成功后，就可视为接入成功，在确定中心节点类型后，再上报接入状态。

查询命令用于查询当前上报开关状态以及当前接入状态。

测试命令用于测试该命令是否支持，以及查询<n>参数的取值范围。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<n>: integer type, 表示主动上报的开关状态

0:  关闭

1:  开启

2：  WEBUI上报

<state>: integer type, 表示接入状态

0:  未接入

1:  接入成功

2:  进入IDLE态

3:   初始接入就直接进入IDLE的状态，此时网络中没有它的IP地址信息

4:  进入切换状态

**Example**

AT^DACS=1<CR><LF>

<CR><LF>^DACSI: 0<CR><LF>

<CR><LF>OK<CR><LF>

<CR><LF>^DACSI: 1<CR><LF>

AT^DACS?<CR><LF>

<CR><LF>^DACS: 1,1<CR><LF>

<CR><LF>OK<CR><LF>

AT^DACS=?<CR><LF>

<CR><LF>^DACS: (0-1)<CR><LF>

<CR><LF>OK<CR><LF>

 

### 3 AT^DRPC: Radio Parameter Configure

| **Command**                                   | **Possible response(s)**                                     |
| --------------------------------------------- | ------------------------------------------------------------ |
| AT^DRPC=<freq>,<bandwidth>,<power>[,<cellid>] |                                                              |
| AT^DRPC?                                      | ^DRPC: （<freq>,<bandwidth>,<power>）,  （<scellfreq>,<scellbandwidth>,<scellpower>） |
| AT^DRPC=?                                     | ^DRPC: (list of supported <freq>s), (list of  supported <bandwidth>s), (list of supported <txpower>s) (list of  supported <cellid>s) |

**Description**

执行命令用于接入状态下的参数设置并保存到NVRAM。打开快跳的情况下，不允许DRPC更改频点。

查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

在单CC条件下，兼容双CC设置。

注：不支持CA，不要配置SCC参数

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<freq>: integer type, 表示频点频率，单位100KHz，范围根据NVRAM设置，默认为（24015~24814,8060~8259,14279~14478, 51500-52499，57250-58249,17850-18049）

<bandwidth>: integer type, 表示带宽

0: 1.4M

1: 3M

2: 5M

3: 10M

4: 15M （不支持）

5: 20M

<power>:“integer“ type, 表示中心节点的固定功率，单位dBm，范围“-40“到“文件系统中设置的MaxPower“ ，MaxPower最大值可以配置为50，同时若超过终端支持最大值，则返回ERROR.，可以配置的范围可以通过AT^DRPC=?获取

<cellid> integer type , Physical cell id

0：Pcell primary cell，主小区

1：Scell  second cell，辅小区

Other value reserved.

**Example**

AT^DRPC=24020,2,”27”,1<CR><LF>

<CR><LF>OK<CR><LF>

AT^DRPC?<CR><LF>

<CR><LF>^DRPC: 24020,2,”27”, ( 0,0,”0”)<CR><LF>

<CR><LF>OK<CR><LF>

AT^DRPC=?<CR><LF>

<CR><LF>^DRPC: (24015-24814,8060-8259,14279-14478, , 51500-52499, 57250-58249,17850-18049) ,(0-5), (-40,40) ,(0-1)<CR><LF>

<CR><LF>OK<CR><LF>

 

### 4 AT^DRPS: Radio Parameter Store in NVRAM

| **Command**                                   | **Possible response(s)**                                     |
| --------------------------------------------- | ------------------------------------------------------------ |
| AT^DRPS=<freq>,<bandwidth>,<power>[,<cellid>] |                                                              |
| AT^DRPS?                                      | ^DRPS: <freq>,<bandwidth>,<power>,（<scellfreq>,<scellbandwidth>,<scellpower>） |
| AT^DRPS=?                                     | ^DRPS: (list of supported <freq>s), (list of  supported <bandwidth>s, (list of supported <txpower>s) (list of  supported <cellid>s) |

**Description**

执行命令用于进行参数保存到NVRAM，保存后进出飞行生效。打开快跳的情况下，不允许DRPS更改频点。

查询命令用于查询当前NVRAM中参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

在单CC条件下，兼容双CC设置。

注：不支持CA，不要配置SCC参数

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<freq>: integer type, 表示频点频率，单位100KHz，范围根据NVRAM设置，默认为（24015~24814,8060~8259,14279~14478, 51500-52499，57250-58249,17850-18049）

<bandwidth>: integer type, 表示带宽

0: 1.4M

1: 3M

2: 5M

3: 10M

4: 15M（不支持）

5: 20M

<power>:“integer“ type, 表示中心节点的固定功率，单位dBm，范围“-40“到“文件系统中设置的MaxPower“ ，MaxPower最大值可以配置为50，同时若超过终端支持最大值，则返回ERROR。

<cellid> integer type , Physical cell id

0：Pcell primary cell，主小区

1：Scell  second cell，辅小区

Other value reserved.

**Example**

AT^DRPS=24020,2,”27”,1<CR><LF>

<CR><LF>OK<CR><LF>

AT^DRPS?<CR><LF>

<CR><LF>^DRPS: 24020,2,”27”, ( 0,0,”0”)<CR><LF>

<CR><LF>OK<CR><LF>

AT^DRPS=?<CR><LF>

<CR><LF>^DRPS: (24015-24814,8060-8259,14279-14478, , 51500-52499, 57250-58249,17850-18049) ,(0-5), (-40,40) ,(0-1)<CR><LF><CR><LF>OK<CR><LF>

 

### 5 AT^DSSMTP: Set Slave Node Max Tx Power

| **Command**                       | **Possible response(s)**      |
| --------------------------------- | ----------------------------- |
| AT^DSSMTP=<power>[,<scell_power>] |                               |
| AT^DSSMTP?                        | ^DSSMTP: <power>,<scellpower> |
| AT^DSSMTP=?                       |                               |

**Description**

执行命令用于进行参数保存到NVRAM，保存后进出飞行生效。

查询命令用于查询当前NVRAM中参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

在单CC条件下，兼容双CC设置。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<power>:“integer“ type, 从节点pcell最大发射功率，单位dBm，范围“-40“到“文件系统中设置的MaxPower“ ，MaxPower最大值可以配置为50，同时若超过终端支持最大值，则返回ERROR。功率范围可以通过AT^DRPS=？获取。

<scellpower>:“integer“ type, 从节点secll最大发射功率，单位dBm，范围“-40“到“文件系统中设置的MaxPower“ ，MaxPower最大值可以配置为50，同时若超过终端支持最大值，则返回ERROR。功率范围可以通过AT^DRPS=？获取。

**Example**

AT^DSSMTP =”-10”,“0”<CR><LF>

<CR><LF>OK<CR><LF>

AT^DSSMTP?<CR><LF>

<CR><LF>”-10”,“0”<CR><LF>

<CR><LF>OK<CR><LF>

AT^DRPS=?<CR><LF>

<CR><LF>OK<CR><LF>

 

### 6 AT^DRPR: Radio Parameter Report

| **Command** | **Possible response(s)**                                     |
| ----------- | ------------------------------------------------------------ |
| AT^DRPR=<n> | [^DRPR: <index>,<cell_index>,<earfcn>,<cell_id>,<rssi>,<pathloss>,<rsrp>,<ul_earfcn>,<snr>,<distance>,<tx_power>,<dl_throughput_total_tbs>,<ul_thrpughput_total_tbs>,<dlsch_tb_error_per>,<mcs>,<rb_num>,<wide_cqi>,<  dlsch_tb_error_per_total>,< Max_Snr>,<Min_Snr>,<  dl_total_tbs_g_rnti>,<ri_relative_value>] |
| AT^DRPR?    | ^DRPR: <n>                                                   |
| AT^DRPR=?   | ^DRPR: (list of supported <n>s)                              |

**Description**

执行命令用于设置本机无线参数上报**^DRPRI: <index>,<cell_index>,<earfcn>,<cell_id>,<rssi>,<pathloss>,<rsrp>,<ul_earfcn >,<snr>,<distance>,<tx_power>,<dl_throughput_total_tbs>,<ul_thrpughput_total_tbs>,<dlsch_tb_error_per>,<mcs>,<rb_num>,<wide_cqi>,< dlsch_tb_error_per_total>,<** **Max_Snr>,<** **Min_Snr>,< dl_total_tbs_g_rnti >,<ri_relative_value>**的开关状态，开机初始默认关闭。

该开关只在本机作为接入节点时有效；对于中心节点即使开关打开也不会发生主动上报。

查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<n>: integer type, 表示主动上报的开关状态

0:  关闭

1:  开启

2： WEBUI上报

<index>: integer type, 表示天线

1:  天线0

2:  天线1

<cell_index>: integer type，表示主小区还是辅小区

0:   pcell(主小区)

1:   scell(辅小区)

<earfcn>: integer type, 测量结果的频点信息

<cell_id>: integer type, 测量结果的小区信息

<rssi>: string type, RSSI测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSSI测量值

"+32767":   无效值

<pathloss>: integer type, 路损值,dBm

0 to 191:  路损值

32767:   无效值

<rsrp>: string type, RSRP测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSRP测量值

"+32767":   无效值

< ul_earfcn >: integer type, 上行频点，及快跳的频点

<snr>: string type,SNR测量值. 格式为"±value"(除"0"以外)

"-50" to "+50":  SNR测量值

"+32767":   无效值

< distance >: integer type, 与对端节点距离, 单位为米，取值范围[0, 5000]

< tx_power >:string type，传输功率，单位dBm, 格式为"±value"(除"0"以外) 

"-50" to "+50": 传输功率

"+32767":   无效值

< dl_throughput_total_tbs >:integer type, 下行吞吐量信息, 上报周期内TB size总和，单位Byte，范围[0,12000000]

< ul_thrpughput_total_tbs >: integer type, 上行吞吐量信息, 上报周期内TB size总和，单位Byte，范围[0,12000000]

< dlsch_tb_error_per >:integer type, 上报周期内误码百分比，范围[0,100]

<mcs>: MCS, 取值范围[0,29]

<rb_num>: RB数量，取值范围[6,100]

<wide_cqi>:宽带CQI，取值范围[1,15]

<dlsch_tb_error_per_total>:进入连接态之后上报总体误码百分比，范围[0,100]

< Max_Snr>:10000ms内的最大snr,取值范围[-40,40]

< Min_Snr>:10000ms内的最小snr, 取值范围[-40,40]

<dl_total_tbs_g_rnti>: integer type, 灌组播包的total_tbsize

<ri_relative_value>：integer type,取值范围[0,222]

**Example**

AT^DRPR=1<CR><LF>

<CR><LF>OK<CR><LF>

AT^DRPR?<CR><LF>

<CR><LF>^DRPR: 1<CR><LF>

<CR><LF>OK<CR><LF>

<CR><LF>^DRPRI: 1,0,1000,16,"-46",20,"-60","-195","0",4000,"-36",10000000,5000000,10,15,3,15, 50,"+30","-25",15000,15<CR><LF>

<CR><LF>^DRPRI: 2,0,1000,16,"-106",115,"-100","-194","+20",4000,"-36",10000000,5000000,10,15,3,15, 50,"+35","-30",15000,15<CR><LF>AT^DRPR=?<CR><LF>

<CR><LF>^DRPR: (0-2)<CR><LF>

<CR><LF>OK<CR><LF>

![img](data:image/png;base64,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)

**1**   <index>: integer type, 表示端口索引号

1:  端口1

2:  端口2

**2**   <cell_index>: integer type，表示主小区还是辅小区

0:   pcell(主小区)

1:   scell(辅小区)

**3**   <earfcn>: integer type, 测量结果的频点信息

**4**   <cell_id>: integer type, 测量结果的小区信息

**5**   <rssi>: string type, RSSI测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSSI测量值

"+32767":   无效值

**6**   <pathloss>: integer type, 路损值,dBm

0 to 191:  路损值

32767:   无效值

**7**   <rsrp>: string type, RSRP测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSRP测量值

"+32767":   无效值

**8**   < ul_earfcn >: integer type, 上行频点，及快跳的频点

**9**   <snr>: string type,SNR测量值. 格式为"±value"(除"0"以外)

"-50" to "+50":  SNR测量值

"+32767":   无效值

**10**  < distance >: integer type, 与对端节点距离, 单位为米，取值范围[0, 5000]

**11**  < tx_power >:string type，传输功率，单位dBm, 格式为"±value"(除"0"以外) 

"-50" to "+50": 传输功率

"+32767":   无效值

**12**  < dl_throughput_total_tbs >:integer type, 下行吞吐量信息, 上报周期内TB size总和，单位Byte，范围[0,12000000]

**13**  < ul_thrpughput_total_tbs >: integer type, 上行吞吐量信息, 上报周期内TB size总和，单位Byte，范围[0,12000000]

**14**  < dlsch_tb_error_per >:integer type, 上报周期内误码百分比，范围[0,100]

**15**  <mcs>: MCS, 取值范围[0,29]

**16**  <rb_num>: RB数量，取值范围[6,100]

**17**  <wide_cqi>:宽带CQI，取值范围[1,15]

**18**  <dlsch_tb_error_per_total>:进入连接态之后上报总体误码百分比，范围[0,100]

**19**  < Max_Snr>:10000ms内的最大snr,取值范围[-40,40]

**20**  < Min_Snr>:10000ms内的最小snr, 取值范围[-40,40]

**21**  <dl_total_tbs_g_rnti>: integer type, 灌组播包的total_tbsize

 

 

### 7 AT^DAPR: Access Nodes radio Parameter Report

| **Command** | **Possible response(s)**                                     |
| ----------- | ------------------------------------------------------------ |
| AT^DAPR=<n> | [^DAPR: <IPv6 address>,<index>,<cell_index>,<rssi>,<earfcn>,<rsrp>,<ul_earfcn>,<snr>,<distance>,<tx_power>,<dl_throughput_total_tbs>,<ul_throughput_total_tbs>,<dlsch_tb_error_per>,<mcs>,<rb_num>,<wide_cqi>,<dlsch_tb_error_per_total>,<Max_Snr>,<Min_Snr>,<dl_total_tbs_g_rnti>**,<** ri_relative_value>,<  pp1s_ssfn_cycle>,< pp1s_ssfn>,< pp1s_irt**>**] |
| AT^DAPR?    | ^DAPR: <n>                                                   |
| AT^DAPR=?   | ^DAPR: (list of supported <n>s)                              |

**Description**

执行命令用于中心节点设置上报已接入节点无线参数**^DAPRI: <IPv6 address>,<index>,**<cell_index>,**<rssi>,**<**earfcn**>,<**rsrp**>,<**ul_earfcn**>**,<snr>,<distance>,<tx_power>,<dl_throughput_total_tbs>,<ul_throughput_total_tbs>,<dlsch_tb_error_per>,<mcs>,<rb_num>,<wide_cqi>,<dlsch_tb_error_per_total>,<Max_Snr>,<Min_Snr>,<dl_total_tbs_g_rnti>,<** **ri_relative_value>,<** **pp1s_ssfn_cycle>,<** **pp1s_ssfn>,<** **pp1s_irt>**的开关状态，开机初始默认关闭。

查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<n>: integer type, 表示主动上报的开关状态

0:  关闭

1:  开启

2： WEBUI上报

<IPv6 address>: string type, 已接入节点的IP地址，由16组数字组成 (0-255)，每组数字间以’.’号隔开，格式为: a1.a2.a3.a4.a5.a6.a7.a8.a9.a10.a11.a12.a13.a14.a15.a16

<index>: integer type, 表示天线

1:  天线0

2:  天线1<cell_index>: integer type，表示主小区还是辅小区

0:   pcell(主小区)

1:   scell(辅小区)

<rssi>: string type, RSSI测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSSI测量值

"+32767":   无效值

<earfcn >: integer type, 当前频点

0 to 191:  路损值

32767:   无效值

<rsrp>: string type, RSRP测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSRP测量值

"+32767":   无效值

< ul_earfcn >: integer type, 上行频点，及快跳的频点

<snr>: string type,SNR测量值. 格式为"±value"(除"0"以外)

"-50" to "+50":  SNR测量值

"+32767":   无效值

< distance >: integer type, 与对端节点距离, 单位为米，取值范围[0, 5000]

< tx_power >:string type，传输功率，单位dBm, 格式为"±value"(除"0"以外) 

"-50" to "+50": 传输功率

"+32767":   无效值

< dl_throughput_total_tbs >:integer type, 下行吞吐量信息, 上报周期内TB size总和，单位Byte，范围[0,12000000]

< ul_thrpughput_total_tbs >: integer type, 上行吞吐量信息, 上报周期内TB size总和，单位Byte，范围[0,12000000]

< dlsch_tb_error_per >:integer type, 上报周期内误码百分比，范围[0,100]

<mcs>: MCS, 取值范围[0,29]

<rb_num>: RB数量，取值范围[6,100]

<wide_cqi>:宽带CQI，取值范围[1,15]

<dlsch_tb_error_per_total>:进入连接态之后上报总体误码百分比，范围[0,100]

< Max_Snr>:10000ms内的最大snr,取值范围[-40,40]

< Min_Snr>:10000ms内的最小snr, 取值范围[-40,40]

<dl_total_tbs_g_rnti>: integer type, 灌组播包的total_tbsize

< ri_relative_value>:

< pp1s_ssfn_cycle>:收到pp1s时的cycle

< pp1s_ssfn>:收到pp1s时的子帧号

< pp1s_irt>:收到pp1s时的定时偏差，单位Ts

**Example**

AT^DAPR=1<CR><LF>

<CR><LF>OK<CR><LF>

AT^DAPR?<CR><LF>

<CR><LF>^DAPR: 1<CR><LF>

<CR><LF>OK<CR><LF>

<CR><LF>^DAPRI: "1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.203",1,0,"-46",20,"-60","-195","0",4000,"-36",10000000,5000000,10,15,3,15, 50,"+30","-25",16000<CR><LF>

<CR><LF>^DAPRI: "1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.203",2,0,"-106",115,"-100","-194","+20",4000,"-36",10000000,5000000,10,15,3,15,50,"+35","-30",16000<CR><LF>

AT^DAPR=?<CR><LF>

<CR><LF>^DAPR: (0-2)<CR><LF>

<CR><LF>OK<CR><LF>

**参数定义说明：**

![img](data:image/png;base64,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)

**1**   <IPv6 address>: string type, 已接入节点的IP地址，由16组数字组成 (0-255)，每组数字间以’.’号隔开，格式为: a1.a2.a3.a4.a5.a6.a7.a8.a9.a10.a11.a12.a13.a14.a15.a16

**2**   <index>: integer type, 表示端口索引号

1:  端口1

2:  端口2

3   <cell_index>: integer type，表示主小区还是辅小区

0:   pcell(主小区)

1:   scell(辅小区)

**4**   <rssi>: string type, RSSI测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSSI测量值

"+32767":   无效值

**5**   <earfcn >: integer type, 当前频点

0 to 191:  路损值

32767:   无效值

**6**   <rsrp>: string type, RSRP测量值,dBm,格式为"±value"(除"0"以外)

"-141" to "-44":  RSRP测量值

"+32767":   无效值

**7**   < ul_earfcn >: integer type, 上行频点，及快跳的频点

**8**   <snr>: string type,SNR测量值. 格式为"±value"(除"0"以外)

"-50" to "+50":  SNR测量值

"+32767":   无效值

**9**   < distance >: integer type, 与对端节点距离, 单位为米，取值范围[0, 5000]

**10**  < tx_power >:string type，传输功率，单位dBm, 格式为"±value"(除"0"以外) 

"-50" to "+50": 传输功率

"+32767":   无效值

**11**  < dl_throughput_total_tbs >:integer type, 下行吞吐量信息, 上报周期内TB size总和，单位Byte，范围[0,12000000]

**12**  < ul_thrpughput_total_tbs >: integer type, 上行吞吐量信息, 上报周期内TB size总和，单位Byte，范围[0,12000000]

**13**  < dlsch_tb_error_per >:integer type, 上报周期内误码百分比，范围[0,100]

**14**  <mcs>: MCS, 取值范围[0,29]

**15**  <rb_num>: RB数量，取值范围[6,100]

**16**  <wide_cqi>:宽带CQI，取值范围[1,15]

**17**  <dlsch_tb_error_per_total>:进入连接态之后上报总体误码百分比，范围[0,100]

**18**  < Max_Snr>:10000ms内的最大snr,取值范围[-40,40]

**19**  < Min_Snr>:10000ms内的最小snr, 取值范围[-40,40]

**20**  <dl_total_tbs_g_rnti>: integer type, 灌组播包的total_tbsize

 

### 8 AT^DAOCNDI: Device Information of Auto Organized Network configuration

| **Command**                                          | **Possible response(s)**                            |
| ---------------------------------------------------- | --------------------------------------------------- |
| AT^DAOCNDI=<pcell band_bitmap>[,<scell_band_bitmap>] |                                                     |
| AT^DAOCNDI?                                          | ^DAOCNDI: <pcell band_bitmap>,  <scell_band_bitmap> |
| AT^DAOCNDI=?                                         |                                                     |

**Description**

执行命令用于设置通信节点工作频段信息，设置后进出飞行生效。

查询命令用于查询通信节点工作频段信息。

测试命令用于测试该命令是否支持。

在单CC条件下，兼容双CC设置。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<band_bitmap>: string type(without double quotes),in hexadecimal format, the rightmost bit is the least significant bit (LSB/bit0).

Bit0:  800M频段（此系列型号不适用）

Bit1:   600M频段

  Bit2:  1.4G频段

Bit3:  2.4G频段（此系列不适用）

Bit4:  1.8G频段（此系列不适用）

Bit6:     5.8G_A频段 51500~58499 （band69）（此系列不适用）

Bit7:     5.8G_B频段 51500~58499 （band70）（此系列不适用）

Bit11： 1.2G频段（band73）（此系列不适用）

**Example**

AT^DAOCNDI=045D,0D<CR><LF>// Set pcell band as 800M/1.4G/2.4G//1.8G/5.8G_A/1.2G；set scell band as 800M/1.4G/2.4G

<CR><LF>OK<CR><LF>

AT^DAOCNDI=01,<CR><LF>// Set pcell band as 800M

<CR><LF>OK<CR><LF>

AT^DAOCNDI?<CR><LF>

<CR><LF>^DAOCNDI: 045D,0D<CR><LF>

<CR><LF>OK<CR><LF>

AT^DAOCNDI=?<CR><LF>

<CR><LF>OK<CR><LF>

 

### 9 AT^DDTC: Device Type Configuration

| **Command**    | **Possible response(s)**          |
| -------------- | --------------------------------- |
| AT^DDTC=<type> |                                   |
| AT^DDTC?       | ^DDTC:<type>,<working type>       |
| AT^DDTC=?      | ^DDTC:(list of supported <type>s) |

**Description**

执行命令用于设置通信节点类型，需要在（+CFUN=1）开机之前设置，+CFUN=1开机之后生效。当终端工作设备类型确定时，主动上报^DDTCI:<type>,**<**working type **>** 

查询命令用于查询通信节点类型信息。

测试命令用于测试该命令是否支持。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<type>: integer type, 表示设备类型

0:  自组网节点（此系列版本不使适用）

1:  中心节点

2:   接入节点

<working type>: integer type, 表示当前实际工作设备类型

0:  自组网节点（此系列版本不使适用）

1:  中心节点

2:   接入节点

**Example**

AT^DDTC=1<CR><LF>

<CR><LF>OK<CR><LF>

AT^DDTC?<CR><LF>

<CR><LF>^DDTC: 1,01<CR><LF>

<CR><LF>OK<CR><LF>

<CR><LF>^DDTCI: 1,2<CR><LF>

AT^DDTC=?<CR><LF>

<CR><LF>^DDTC: (0-2)<CR><LF>

<CR><LF>OK<CR><LF>

 

### 10 AT^DAPI: Access Password ID of Auto Organized Network configuration

| **Command**           | **Possible response(s)** |
| --------------------- | ------------------------ |
| AT^DAPI=<password_id> |                          |
| AT^DAPI?              | ^DAPI: <password_id>     |
| AT^DAPI=?             |                          |

**Description**

设置命令用于设置通信节点PASSWORD ID。重新上电开机生效。

查询命令用于查询通信节点PASSWORD ID。

测试命令用于测试该命令是否支持。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<password_id>: string type, in HEX format, 数据最长支持32字节（HEX字符串64个字符）

**Example**

AT^DAPI=”30313233FBFA”<CR><LF>

<CR><LF>OK<CR><LF>

AT^DAPI?<CR><LF>

<CR><LF>^DAPI: “30313233FBFA”<CR><LF>

<CR><LF>OK<CR><LF>

AT^DAPI=?<CR><LF>

<CR><LF>OK<CR><LF>

 

### 11 AT^DIPAN: IP Address of All accessible Node

| **Command** | **Possible response(s)**                                     |
| ----------- | ------------------------------------------------------------ |
| AT^DIPAN    | ^DIPAN: <n><m>[,<IP  Type>,<IP address_1>,<state 1>[,IP address_2>,<state  2>...[,<IP address_m>,<state m>]]] |
| AT^DIPAN=?  |                                                              |

**Description**

执行命令用于查询当前可达节点信息，当前可达节点信息发生改变时，Core Module主动上报^DIPANI: <n><m>[,<IP Type>,<IP address_1>,<state 1>[,IP address_2>,<state 2>...[,<IP address_m>,<state m>]]]

测试命令用于测试该命令是否支持。

Final result code

OK

Successful

ERROR or +CME ERROR: <err>

Command performing failed

Unsolicited result code

^DIPANI: <n><m>[,<IP Type>,<IP address_1>,<state 1>[,IP address_2>,<state 2>...[,<IP address_m>,<state m>]]]

 **Defined values**

<n>: integer type, 表示网络中初始接入进IDLE态的节点个数,这类节点不会上报IP地址给网络.所以只上报这些节点的个数.

<m>: integer type, 表示可达结点个数，包括IDLE节点，个节点状态通过state参数指示。

<IP type>: integer type, 表示IP地址类型

0:  IPV4

1:  IPV6

<IP address>: string type, 可达结点的IP地址，如果<IP type>为IPV6，<IP address>由16组数字组成 (0-255)，每组数字间以’.’号隔开，格式为: a1.a2.a3.a4.a5.a6.a7.a8.a9.a10.a11.a12.a13.a14.a15.a16； 如果<IP type>为IPV4，<IP address>由4组数字组成 (0-255)，每组数字间以’.’号隔开，格式为: a1.a2.a3.a4

<state>:integer type, 表示节点状态

0:  空闲态

1   连接态

**Example**

AT^DIPAN<CR><LF>

<CR><LF>^DIPAN:0, 0<CR><LF>

<CR><LF>OK<CR><LF>

<CR><LF>^DIPANI: 0,1, 1,"1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.203"，0<><CR><LF>

<CR><LF>^DIPANI: 0,2,1, "1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.203"，0

"1.2.3.4.0.0.0.0.1.2.3.4.200.201.202.204"，1<><CR><LF>

AT^DIPAN=?<CR><LF>

<CR><LF>OK<CR><LF>

 

### 12 AT^DSTC: Set TDD configuration

| **Command**    | **Possible response(s)**           |
| -------------- | ---------------------------------- |
| AT^DSTC=<conf> |                                    |
| AT^DSTC?       | ^DSTC: <conf>                      |
| AT^DSTC=?      | ^DSTC: (list of supported <conf>s) |

**Description**

执行命令用于进行参数设置，设置后下电重新开机生效。

查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<conf>: integer type, 表示TDD config 设置

0: config0 (2D3U) 

1: config1 (3D2U)

2: config2 (4D1U) 

3: config2 (1D4U)

**Example**

AT^DSTC=0<CR><LF>

<CR><LF>OK<CR><LF>

AT^DSTC?<CR><LF>

<CR><LF>^DSTC:0<CR><LF>

<CR><LF>OK<CR><LF>

AT^DSTC=?<CR><LF>

<CR><LF>^DSTC: (0-2)<CR><LF>

<CR><LF>OK<CR><LF>

 

### 13 AT^DUBR: UART Baud Rate setting

| **Command**                                                  | **Possible response(s)**                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| AT^DUBR=<rate>[, < data_bits  >,<parity_check.>,< stop_bits >] |                                                              |
| AT^DUBR?                                                     | ^DUBR: <rate>[, < data_bits  >,<parity_check.>,< stop_bits >] |
| AT^DUBR=?                                                    | ^DUBR: (list of supported <rate>s),(list of  supported < data_bits >s),(list of supported <  parity_check.>s),(list of supported < stop_bits.>s) |

**Description**

执行命令用于设置UART口波特率参数、数据位、奇偶校验参数、停止位，设置后下电重新开机生效。

查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<rate>: integer type, 表示UART口波特率参数，取值范围如下：

1200: 1200 bit/s

2400: 2400 bit/s

4800: 4800 bit /s

9600: 9600 bit /s

19200: 19200 bit /s

28800: 28800 bit /s

38400: 38400 bit /s

57600: 57600 bit /s

76800: 76800 bit /s

100000: 100000 bit/s

115200: 115200 bit /s

230400: 230400 bit /s

460800: 460800 bit /s

921600: 921600 bit /s

1152000: 1152000 bit /s

2304000: 2304000 bit /s

3750000: 3750000 bit /s

4000000: 4000000 bit /s

< data_bits >：integer type, 表示UART口数据位，取值范围：5~8

< parity_check.>：integer type, 表示UART口奇偶校验，取值范围如下：

0:无奇偶校验

1：奇校验

2：偶校验

< stop_bits >: integer type, 表示UART口停止位，取值范围：0~2

**Example**

AT^DUBR=57600<CR>

<CR><LF>OK<CR><LF>

AT^DUBR?<CR><LF>

<CR><LF>^DUBR: 57600<CR><LF>

<CR><LF>OK<CR><LF>

AT^DUBR=?<CR>

<CR><LF>^DUBR: (1200,2400,4800,9600,19200,28800,38400,57600,76800,100000,115200, 230400, 460800, 921600, 1152000, 2304000, 3750000, 4000000),(5-8),(0-2),(0-2) <CR><LF>

<CR><LF>OK<CR><LF>

AT^DUBR=57600,8,0,0<CR>

<CR><LF>OK<CR><LF>

AT^DUBR?<CR><LF>

<CR><LF>^DUBR: 57600,8,0,0<CR><LF>

 

### 14 AT^DCIAC: Ciphering and IntegralityArithmetic Configuration

| **Command**      | **Possible response(s)**             |
| ---------------- | ------------------------------------ |
| AT^DCIAC=<arith> |                                      |
| AT^DCIAC?        | ^DCIAC: <arith>                      |
| AT^DCIAC=?       | ^DCIAC: (list of supported <arith>s) |

**Description**

执行命令用于设置加密和完保算法，设置后下电重新开机生效。

查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<arith>: integer type, 表示加密和完保算法，取值范围如下：

0: none ciphering and integrality

1: SNOW

2: AES

3: ZUC

**Example**

AT^DCIAC=2<CR>

<CR><LF>OK<CR><LF>

AT^DCIAC?<CR><LF>

<CR><LF>^DCIAC: 2<CR><LF>

<CR><LF>OK<CR><LF>

AT^DCIAC=?<CR>

<CR><LF>^DCIAC: (0-3) <CR><LF>

<CR><LF>OK<CR><LF>

 

### 15 AT^DFHC: Frequency Hopping Control

| **Command**                | **Possible response(s)**                                     |
| -------------------------- | ------------------------------------------------------------ |
| AT^DFHC=<n>[,<HopInteval>] |                                                              |
| AT^DFHC?                   | ^DFHC: <n>[,<HopInteval>]                                    |
| AT^DFHC=?                  | ^DFHC: (list of supported <n>s),  (list of supported <HopInteval>s) |

**Description**

执行命令用于进行跳频参数设置，设置后立即生效。已打开快跳的情况下，再DFHC打开慢跳，返回ERROR。查询命令用于查询当前参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<n>: integer type, 表示跳频功能设置

0: 关闭跳频功能

1: 打开跳频功能

<HopInteval>: integer type, 表示每轮跳频之间的间隔,取值[0,60]，单位是s，如果取值为0，则表示使用默认配置20s。

**Example**

AT^DFHC=0<CR><LF>

<CR><LF>OK<CR><LF>

AT^DFHC?<CR><LF>

<CR><LF>^DFHC:0<CR><LF>

<CR><LF>OK<CR><LF>

AT^DFHC=0,30<CR><LF>

<CR><LF>OK<CR><LF>

AT^DFHC?<CR><LF>

<CR><LF>^DFHC:0,30<CR><LF>

<CR><LF>OK<CR><LF>

AT^DFHC=?<CR><LF>

<CR><LF>^DFHC: (0-1),(0-60)<CR><LF>

<CR><LF>OK<CR><LF>

 

### 16 AT^DSONSCF: SET CA Flag

| **Command**       | **Possible response(s)**               |
| ----------------- | -------------------------------------- |
| AT^DSONSCF=<mode> |                                        |
| AT^DSONSCF?       | ^DSONSCF:  <mode>                      |
| AT^DSONSCF=?      | ^DSONSCF: (list of  supported <mode>s) |

**Description**

设置命令用于打开、关闭双CC功能。进出飞行设置生效；打开快跳下，使能CA能力按返回ERROR处理。如果^DSONMIMOF=1,设置打开CA也会返回ERROR。

查询命令用于查询当前双CC功能使能状态；

测试命令返回所支持的<mode>取值；

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<mode>: integer type, 所要执行的操作类型

0: 关闭双CC功能

1: 打开双CC功能

**Example**

AT^DSONSCF=1<CR>

<CR><LF>OK<CR><LF>

AT^DSONSCF?<CR>

<CR><LF>^DSONSCF: 1<CR><LF>

<CR><LF>OK<CR><LF>

AT^DSONSCF=?<CR>

<CR><LF>^DSONSCF: (0-1) <CR><LF>

<CR><LF>OK<CR><LF>

 

### 17 AT^DSONMIMOF: SET MIMO Flag

| **Command**          | **Possible response(s)**                 |
| -------------------- | ---------------------------------------- |
| AT^DSONMIMOF =<mode> |                                          |
| AT^DSONMIMOF?        | ^DSONMIMOF:  <mode>                      |
| AT^DSONMIMOF =?      | ^DSONMIMOF: (list of  supported <mode>s) |

**Description**

设置命令用于打开、关闭MIMO功能。进出飞行设置生效；如果^DSONSCF=1,设置打开MIMO会返回ERROR。

查询命令用于查询当前MIMO功能使能状态；

测试命令返回所支持的<mode>取值；

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<mode>: integer type, 所要执行的操作类型

0: 关闭MIMO功能

1: 打开MIMO功能

2：关闭MIMO，实时生效

3：开启MIMO，实时生效

**Example**

AT^DSONMIMOF=1<CR>

<CR><LF>OK<CR><LF>

AT^ DSONMIMOF?<CR>

<CR><LF>^ DSONMIMOF: 1<CR><LF>

<CR><LF>OK<CR><LF>

AT^ DSONMIMOF =?<CR>

<CR><LF>^ DSONMIMOF: (0-1) <CR><LF>

<CR><LF>OK<CR><LF>

### 18 AT^DSONSCAP: SET CA MIMO capability

| **Command**           | **Possible response(s)**                |
| --------------------- | --------------------------------------- |
| AT^ DSONSCAP  =<mode> |                                         |
| AT^DSONSCAP?          | ^DSONSCAP:  <mode>                      |
| AT^DSONSCAP =?        | ^DSONSCAP: (list of  supported <mode>s) |

**Description**

设置命令用于打开、关闭CA MIMO能力。进出飞行设置生效；

查询命令用于查询当前CA MIMO能力使能状态；

测试命令返回所支持的<mode>取值；

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<mode>: integer type, 所要执行的操作类型

0: 不支持CA MIMO

1: 支持CA

2：支持MIMO

3：支持CA MIMO

**Example**

AT^ DSONSCAP =1<CR>

<CR><LF>OK<CR><LF>

AT^ DSONSCAP?<CR>

<CR><LF>^ DSONSCAP: 1<CR><LF>

<CR><LF>OK<CR><LF>

AT^ DSONSCAP =?<CR>

<CR><LF>^ DSONSCAP: (0-1) <CR><LF>

<CR><LF>OK<CR><LF>

 

### 19 AT^DLF:Lock Freq

| **Command**                                  | **Possible response(s)**                                     |
| -------------------------------------------- | ------------------------------------------------------------ |
| AT^DLF=<lock_type>,pcell frq[,<scell  freq>] |                                                              |
| AT^DLF?                                      | ^DLF: <lock_type>,< pcell freq>,<  scell freq>               |
| AT^DLF=?                                     | ^DLF: (list of supported<；lock_type>s)，(list  of supported lock <freq>s) |

**Description**

执行命令用于控制用户设置锁频信息，设置值保存到NVRAM中，进出飞行生效。当支持CA时，可以仅锁频pcellFreq，此时scellFreq需设置为65535；当不支持CA时，仅锁频pcellFrq有效；不支持单独锁频scellFreq

查询命令用于查询当前NVRAM中参数设置。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<LockType >: integer type, 表示用户设置锁定指定频点开关设置

0: 不锁频或者解除已锁频点

1: 锁定指定频点

<pcellFreq>: integer type, 表示pcell频点频率，单位100KHz，范围（8060-8259,14279-14478,24015-24814,17850-18050，51500-52499,57250-58249,5000-6999）

<scellFreq>: integer type, 表示secell频点频率，单位100KHz，范围（8060-8259,14279-14478,24015-24814,17850-18050，51500-52499,57250-58249,5000-6999）. 

**Example**

AT^DLF=1,52050,52150<CR><LF>

<CR><LF>OK<CR><LF>

AT^DLF=0<CR><LF>

<CR><LF>OK<CR><LF>

AT^DLF?<CR><LF>

<CR><LF>^DLF: 1, 52050, 52150<CR><LF>

<CR><LF>OK<CR><LF>

AT^ DLF =?<CR><LF>

<CR><LF>^ DLF: (0-1), （8060-8259,14279-14478,24015-24814,17850-18050，51500-52499,57250-58249,5000-6999）<CR><LF>

<CR><LF>OK<CR><LF>

### 20 AT^DSONSBR: Sub Band Range

| **Command**                                                  | **Possible response(s)**                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| AT^DSONSBR=<band>,<earfcn_start>,<earfcn_end>[,<band>,<earfcn_start>,<earfcn_end>[,<band>,<earfcn_start>,<earfcn_end>]…] |                                                              |
| AT^DSONSBR?                                                  | ^DSONSBR:  <band>,<earfcn_start>,<earfcn_end>[,<band>,<earfcn_start>,<earfcn_end>[,<band>,<earfcn_start>,<earfcn_end>]…] |
| AT^DSONSBR=?                                                 | ^DSONSBR:  <band>,(list of supported <earfcn>s), <band>,(list of  supported <earfcn>s),… |

**Description**

执行命令用于配置各子频段的频点范围，保存到NVRAM，进出飞行生效。

查询命令用于查询当前各子频段范围配置。

测试命令用于测试该命令是否支持，以及各子频段允许配置的频点范围。

**Final result code**

**OK**

Successful

**ERROR or +CME ERROR: <err>**

Command performing failed

**Defined values**

<band>: integer type, 子频段编号

64: BAND64

65: BAND65

66: BAND66

67: BAND67

69: BAND69

70: BAND70

71: BAND71

73: BAND73

<earfcn_start>: integer type, 起始频点号，取值范围与子频段相关，其取值必须不大于<earfcn_end>

BAND64: 24015-24814

BAND65: 8060-8259

BAND66: 14279-14478 

BAND67: 17850-18049

BAND69: 51500-58499 

BAND70: 51500-58499

BAND71: 5000-6999

BAND73:11000-14000

<earfcn_end>: integer type, 结束频点号，取值范围与子频段相关，其取值不能小于<earfcn_start>

BAND64: 24015-24814

BAND65: 8060-8259

BAND66: 14279-14478 

BAND67: 17850-18049

BAND69: 51500-58499 

BAND70: 51500-58499

BAND71: 5000-6999

BAND73:11000-14000

**Example**

AT^DSONSBR=64,24020,24800,66,14280,14470<CR><LF>

<CR><LF>OK<CR><LF>

AT^DSONSBR?<CR><LF>

<CR><LF>^DSONSBR: 64,24020,24800,66,14280,14470<CR><LF>

<CR><LF>OK<CR><LF>

AT^DSONSBR=?<CR><LF>

<CR><LF>^DSONSBR: 64,24015-24814,65,8060-8259,66,14279-14478, 67,17850-18049,69,51500-52449,70, 57250-58249,71,5000-6999 <CR><LF>

<CR><LF>OK<CR><LF>

 

### 21 AT^NETIFCFG： IP地址配置

| **Command**                                                  | **Possible response(s)**                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| AT^ NETIFCFG =<type>,<master_ip address>[,<sub_mask addresss>][,<net  gateway addresss>] |                                                              |
| AT^ NETIFCFG?                                                | ^NETIFCFG :<type  >,<master_ip address>[,<sub_mask addresss>][,<net gateway  addresss>] |
| AT^ NETIFCFG =?                                              | ^ NETIFCFG: (list of  supported < type >s)                   |

**Description**

执行命令用于进行设置模块的IP地址，子网掩码，网关等。

查询命令用于查询当前模块的IP地址，子网掩码，网关等。

测试命令用于测试该命令是否支持，以及查询参数的取值范围。

| **Response**                   | **result**                |
| ------------------------------ | ------------------------- |
| **OK**                         | Successful                |
| **ERROR or +CME ERROR: <err>** | Command performing failed |

**Defined values**

< type >: integer type，表示设置哪些参数

2: 设置ip地址

3: 设置ip地址，子网掩码

4: 设置ip地址，子网掩码，网关

<master_ip address>： string type，模块IP地址

< sub_mask addresss >： string type，子网掩码

< net gateway addresss >： string type，网关地址

**Example**

AT^ NETIFCFG =2,“192.168.43.128”

<CR><LF>OK<CR><LF>

AT^ NETIFCFG?<CR><LF>

<CR><LF>^ NETIFCFG:2,“192.168.43.128”<CR><LF>

<CR><LF>OK<CR><LF>

AT^ NETIFCFG =?<CR><LF>

<CR><LF>^ NETIFCFG: (2-4)，<master_ip address>[,<sub_mask addresss>][,]<CR><LF>

<CR><LF>OK<CR><LF>

 

### 22 AT^POWERCTL：主动掉电重启开关

| Set Command     AT^POWERCTL=<value> | Set command is used to reboot os  Response:  OK  If error is related to ME functionality:  +CME ERROR: 100  Parameter:  < value>: integer of the reboot os,only one value  1 |
| ----------------------------------- | ------------------------------------------------------------ |
| Test Command  AT^POWERCTL=?         | Response:  ^POWERCTL: (list of supported < vlaue >)  OK  Parameter  See set command  Example  ^POWERCTL:1  OK |

**Description**

执行命令用于模块重启。

**Example**

AT^POWERCTL=1<CR><LF>

<CR><LF>OK<CR><LF>

### 23 AT^RECOVSET: 执行恢复出厂设置

| **Command**          | **Possible response(s)** |
| -------------------- | ------------------------ |
| AT^RECOVSET=  <type> | OK                       |
| AT^RECOVSET?         | +CME ERROR:  100         |
| AT^RECOVSET=?        | ^RECOVSET: (1)           |

**Defined values**

< type >：

1：执行恢复出厂设置，擦出data分区，其它type，返回error

**Example**：

AT^RECOVSET=1

OK

AT^RECOVSET=?

^RECOVSET: (1)

AT^RECOVSET?

+CME ERROR: 100

 