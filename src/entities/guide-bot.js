// Hướng dẫn viên chòi triển lãm (Pavilion): bot voxel LUÔN ở trong sảnh, đọc thoại thông tin các bức tranh.
//   · người chơi ở ngoài sảnh  -> đi qua đi lại trong sảnh (tuần tra)
//   · người chơi bước lên sảnh -> chạy lại gần, đi theo bên cạnh (không chặn tầm nhìn)
//   · người chơi nhìn vào 1 bức tranh (~0.5s) -> quay người, giơ tay chỉ, đọc: tên + chức vụ (kịch bản dạng "AI form")
// Nạp SAU pavilion.js (cần window.PavilionGuide) và SAU core.js / i18n.js / boss-talk.js (dùng S, C, L, playing, LN, trLine, .bt).
// Ngôn ngữ: vi / en / ko có kịch bản viết tay; 8 ngôn ngữ còn lại dùng kịch bản tiếng Anh rồi dịch bằng trLine() của boss-talk.js (có cache).
(function(){
'use strict';
if(typeof THREE==='undefined'||typeof VB==='undefined'||typeof S==='undefined'){console.warn('[GuideBot] thiếu THREE / VB / S, bỏ qua');return}

const CFG={
  walk:1.1, run:4.2,          // m/s: tuần tra / chạy theo người chơi
  followDist:1.15,            // khoảng cách đứng cạnh người chơi
  zMin:-1.9, zMax:1.9,       // dải đi lại trong sảnh (z cục bộ): lối đi giữa 2 hàng tranh đối diện (bảng tên hàng sau z≈-1.2, hàng trước z≈+1.1)
  xPad:1.2,                   // cách mép sảnh
  lookMargin:.4, lookRange:9, // dung sai khi ngắm tranh (m) / tầm xa nhất (m)
  dwell:.5,                   // nhìn liên tục bao lâu thì bắt đầu đọc (s)
  cooldown:25,                // không đọc lại cùng 1 tranh trong khoảng này (s)
  tts:true,                   // đọc thành tiếng
  showText:false,             // false = chỉ ĐỌC, không hiện chữ trên màn hình (nếu máy không đọc được thì tự hiện chữ thay thế)
  rate:1.2,                   // tốc độ đọc (1 = bình thường; 1.1–1.3 nhanh vừa; tăng nữa dễ khó nghe)
  cloudTTS:true,              // nếu máy KHÔNG có giọng tự nhiên đúng ngôn ngữ -> dùng giọng Google Dịch (cần mạng). false = chỉ dùng giọng có sẵn trong máy; không có giọng đúng ngôn ngữ thì chỉ hiện chữ, không đọc bằng giọng sai
  ai:null                     // async (info, lang) => string | null — mặc định gắn AITalk (Groq) ở dưới; null/lỗi => kịch bản mẫu
};

// ---------- DỮ LIỆU ĐỌC ----------
// Khóa định danh một bức tranh: bỏ dấu, bỏ "PROF." -> 'MURIEL MEDARD' (đổi chữ in trên bảng tên không làm mất tiểu sử)
const keyOf=i=>String(i.n1).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/^(PROF|DR)\.?\s+/,'');   // bỏ danh xưng PROF. / DR. khi tra tiểu sử
const SPOKEN={ 'BLOCKCHAINJEFF':'Blockchain Jeff','MURIEL MEDARD':'Prof. Muriel Médard','KISHORI KONWAR':'Dr. Kishori Konwar','NANCY LYNCH':'Prof. Nancy Lynch','SRIRAM VISWANATH':'Prof. Sriram Viswanath' };   // tên đọc khác với tên in trên bảng
// Dữ kiện do bạn cung cấp (tiếng Việt; AI tự đọc sang ngôn ngữ đang chọn). Mỗi lần đọc AI chọn ý chính khác nhau + kiểu kể khác nhau.
const FACTS={
  'MURIEL MEDARD':'Giáo sư Muriel Médard, đồng sáng lập và CEO của Optimum. Sinh ngày 1 tháng 2 năm 1968, quốc tịch Pháp–Mỹ, là nhà lý thuyết thông tin và kỹ sư điện. Bà là NEC Professor of Software Science and Engineering tại khoa EECS của MIT và dẫn dắt nhóm Network Coding and Reliable Communications tại Research Laboratory of Electronics. Học vấn toàn bộ tại MIT: cử nhân EECS và toán (1989), cử nhân nhân văn / Russian studies cùng thạc sĩ kỹ thuật điện (1991), tiến sĩ Sc.D. kỹ thuật điện (1995) dưới sự hướng dẫn của Robert G. Gallager. Sự nghiệp: nghiên cứu sau tiến sĩ tại MIT Lincoln Laboratory, trợ lý giáo sư tại University of Illinois Urbana–Champaign (1998), về MIT từ năm 2000; chủ tịch IEEE Information Theory Society (2012), từng là tổng biên tập IEEE Journal on Selected Areas in Communications. Bà đồng phát minh RLNC: các nút mạng gửi tổ hợp tuyến tính ngẫu nhiên của gói tin, không cần điều phối trung tâm, giúp truyền dữ liệu chịu mất gói và dùng băng thông hiệu quả hơn; Optimum áp dụng kỹ thuật này vào gossip và truyền block trên blockchain. Danh hiệu: thành viên US National Academy of Engineering (2020), American Academy of Arts and Sciences (2021), Leopoldina của Đức (2022); Fellow IEEE (2008), US National Academy of Inventors (2018), Royal Academy of Engineering (2025). Tiến sĩ danh dự từ Technical University of Munich (2020), Aalborg (2022), Budapest University of Technology and Economics (2023). Giải IEEE Richard W. Hamming Medal 2026 cho đóng góp về mã hóa cho truyền thông tin cậy. Bà đồng sáng lập CodeOn, Steinwurf (Chief Scientist) và các công ty chuyển giao công nghệ khác; Optimum là lần gần nhất, nơi bà làm CEO.',
  'KENT LIN':'Kent Lin, đồng sáng lập Optimum (một số nguồn ghi thêm COO). Theo trang chính thức của Optimum, ông phụ trách adoption và tăng trưởng hệ sinh thái: business development, tokenomics và gọi vốn. Lý lịch: cử nhân kỹ thuật hàng không vũ trụ tại Nanyang Technological University (Singapore); MBA Harvard Business School nhưng bỏ giữa chừng để làm Optimum toàn thời gian. Từng là Partner tại GSRV, nhánh crypto của GSR Ventures, quỹ được Optimum mô tả khoảng 4 tỷ USD; Chủ tịch Harvard Blockchain Club, tổ chức Harvard Blockchain Conference 2024; sáng lập McKinsey Crypto DAO với hơn 200 cựu McKinsey hoạt động trong Web3. Từ khoảng 2019 ông tham gia ủy ban Crypto và Web3 của Singapore FinTech Association. Ông kể đã gặp giáo sư Médard khi đang học MBA, thấy RLNC giải được lớp bộ nhớ còn thiếu của blockchain, vì gossip và nhân bản full node chậm và tốn băng thông. Ba người, Médard, Kishori Konwar và ông, dừng công việc cũ để thành lập Optimum; ông bỏ Harvard, còn Médard xin nghỉ phép ở MIT. Ông thường xuất hiện cùng David Song tại các sự kiện châu Á như Token2049, BUIDL Asia Seoul, Nanyang Blockchain Conference.',
  'ELI LAIPSON':'Eli Laipson, CMO của Optimum. Trên sơ đồ tổ chức ông mang chức CMO; bio trên X ghi Head of Marketing tại Optimum, ở Boston. Vai trò công khai: xây đội marketing cốt lõi (từng tuyển Social Media Lead, Community Lead, community mods), truyền thông các sản phẩm như flexnode và mump2p, và khuếch đại các cột mốc kỹ thuật, ví dụ giải Hamming của giáo sư Médard. Tiểu sử trước Optimum ít được công bố chính thức; bài viết cũ của ông khoảng 2016–2017 nói về product management và partnership cho startup B2B SaaS, và ông có chứng chỉ Pragmatic Marketing. Không được suy diễn thêm về các công ty trước đây của ông.',
  'DAVID SONG':'David Song, APAC Growth Lead của Optimum. Bio tự ghi: trước đó là Head of BD tại Cosmostation; cựu sinh viên Binghamton University. Optimum xác nhận vai trò này trên các bài đăng chính thức: APAC Tour (Singapore, Hong Kong, Shenzhen, khoảng tháng 8/2026), có mặt tại Nanyang Blockchain Conference cùng hai co-founder; recap BUIDL Asia Seoul (tháng 4/2026) cùng Kent Lin, gặp builder và trình bày. Nhiệm vụ thực tế là tăng trưởng khu vực châu Á–Thái Bình Dương: sự kiện, quan hệ builder và validator, và làm cầu nối giữa nghiên cứu RLNC với hệ sinh thái APAC.',
  'BLOCKCHAINJEFF':'Blockchain Jeff, admin cộng đồng của Optimum. Anh host các buổi community call, cập nhật sự kiện và là người kết nối thành viên với team. Anh làm marketing và cộng đồng Web3 khoảng chín năm.',
  'FLASH':'Flash, lead moderator của Optimum. Anh giữ Discord, duyệt nội dung và hỗ trợ thành viên khi cần. Anh ở Đức, hiện cũng là moderator cho Ritual, trước đó từng làm cộng đồng cho Polyhedra, Redbelly, Aleo và Avalanche.',
  'ABBAS':'Abbas, Tech Ambassador của Optimum. Anh viết thread giải thích RLNC, cách dữ liệu đi giữa các node, và vì sao Optimum là lớp hạ tầng chứ không phải một chain mới. Anh là người giải thích kỹ thuật cho cộng đồng.',
  'CHANDLER OTTERBEIN':'Chandler Otterbein, phụ trách Strategy & Operations (chiến lược và vận hành) của Optimum. Anh ở Optimum từ khá sớm, khoảng năm 2024. Trước đó anh là chủ tịch NEU Blockchain, từng làm tại Brown Brothers Harriman và từng ở student advisory board của Enterprise Ethereum Alliance. Mảng của anh gồm vận hành, nghiên cứu và cách dự án đi ra bên ngoài.',
  'HAR PREET SINGH':'Har Preet Singh, VP Engineering (Phó chủ tịch kỹ thuật) của Optimum. Anh dẫn dắt đội kỹ thuật, phụ trách phần đưa mump2p chạy thật trên mạng. Trước khi vào Optimum, anh làm blockchain và hệ thống phân tán khoảng mười năm, từng ở Umee, Ignite (tức Tendermint) và FIWARE. Nói ngắn gọn, anh là người biến nghiên cứu RLNC thành sản phẩm mà validator đang dùng.',
  'ALAN SUNNY':'Alan Sunny, Head of TCSM của Optimum. Ông phụ trách mảng hỗ trợ kỹ thuật cho khách hàng: làm cầu nối giữa đội nghiên cứu/engineering và các validator, node operator, team chain đang tích hợp Optimum. Công việc chính là hướng dẫn triển khai, xử lý sự cố và giúp khách dùng mump2p / hạ tầng tăng tốc dữ liệu thành công. Trước Optimum, ông làm Technical Customer Success ở Obol, và kỹ sư node/blockchain ở Blockdaemon và Ankr. Ông ở Anh (Newcastle).',
  'SAJIDA ZOUARHI':'Sajida Zouarhi, Chief Product Officer của Optimum. Cô có hơn 10 năm trong crypto. Trước khi về Optimum, cô giữ các vai trò product, research và strategy tại ConsenSys, Tezos (Nomadic Labs) và Blocknative. Ở ConsenSys, cô từng dẫn dắt product kỹ thuật quanh Ethereum, trong đó có giai đoạn The Merge và client Hyperledger Besu. Ở Blocknative, cô phụ trách mảng gas network và quan sát mempool. Cô gia nhập Optimum từ năm 2025 với vai trò Head of Product, sau đó là CPO. Tại đây cô chịu trách nhiệm đưa OptimumP2P và mump2p ra validator: làm cho block và attestation lan truyền nhanh hơn, ổn định hơn, giảm băng thông, mà không đụng consensus. Cô cũng là người hay nói về cost of uncertainty, tức độ trễ không đều trên đường blockspace của Ethereum ảnh hưởng thế nào tới builder, relay và phần thưởng của validator.',
  'KISHORI KONWAR':'Tiến sĩ Kishori Konwar, đồng sáng lập và CTO của Optimum. Ông có chuyên môn sâu về distributed systems, coding theory và AI. Trước Optimum, ông từng là Senior Engineer & Scientist tại Meta, hoàn thành postdoc về Network Coding tại MIT, và từng làm quant tại Goldman Sachs. Học vấn gồm Master of Science (Physics) tại IIT Kanpur và MTech tại Indian Statistical Institute, Kolkata. Cùng Prof. Muriel Médard và Kent Lin, ông đồng sáng lập Optimum năm 2024 để đưa RLNC (Random Linear Network Coding) vào hạ tầng dữ liệu blockchain, tập trung vào tốc độ lan truyền và hiệu quả băng thông.',
  'NANCY LYNCH':'Giáo sư Nancy Lynch, cố vấn (advisor) học thuật gắn trực tiếp với nền tảng kỹ thuật của dự án. Bà là cựu NEC Chair tại MIT, người giữ ghế này trước Prof. Muriel Médard. Bà công bố chứng minh toán học đầu tiên về Byzantine Fault Tolerance (BFT) năm 1985, tính chất an toàn mà mọi giao thức consensus blockchain đều dựa vào. Năm 1988 bà đưa ra thuật toán DLS, tiền thân của Tendermint và các nhánh consensus sau này, trong đó có Ethereum.',
  'SRIRAM VISWANATH':'Giáo sư Sriram Viswanath, cố vấn (advisor) học thuật gắn trực tiếp với nền tảng kỹ thuật của dự án. Ông có B.Tech tại IIT Madras, M.S. tại Caltech và PhD tại Stanford, đều ngành điện. Ông nghiên cứu information theory, truyền thông không dây và network science. Ông từng nhận NSF CAREER Award và giải IEEE IT/ComSoc Best Paper Award năm 2005.'
};   // thêm / sửa dữ kiện thật của người khác tại đây (mỗi người 1 chuỗi, khóa = tên in trên bảng, viết hoa, bỏ dấu, bỏ "PROF."). Người không có mục: bot chỉ nói chức vụ + thông tin chung về Optimum, KHÔNG bịa tiểu sử.
const COMMON='Optimum (x.com/get_optimum) là hạ tầng bộ nhớ hiệu năng cao / mạng tăng tốc dữ liệu cho mọi blockchain, xây trên RLNC, công nghệ ra đời từ nghiên cứu ở MIT. Sản phẩm đầu tiên mump2p tăng tốc lan truyền dữ liệu Ethereum; kế tiếp là deRAM (bộ nhớ phi tập trung) và deROM; Flexnode là node ai cũng chạy được. Tháng 4/2025 Optimum huy động 11 triệu USD, có 1kx, Spartan, Robot Ventures, Triton Capital, Finality Capital, SNZ ủng hộ. Đội ngũ công khai danh tính, nhiều người từ MIT, Harvard và Meta.';
const BIO={   // bản đọc dự phòng khi AI không dùng được (vi/en/ko; ngôn ngữ khác tự dịch bằng trLine)
  'MURIEL MEDARD':{
    vi:'Bà sinh năm 1968, là giáo sư NEC tại MIT và dẫn dắt nhóm Network Coding and Reliable Communications. Bà đồng phát minh RLNC, công nghệ nền tảng của Optimum, là thành viên Viện Hàn lâm Kỹ thuật Quốc gia Hoa Kỳ và Leopoldina của Đức, và nhận giải IEEE Hamming Medal 2026.',
    en:'Born in 1968, she is the NEC Professor at MIT and leads the Network Coding and Reliable Communications group. She co-invented RLNC, the technology behind Optimum, is a member of the US National Academy of Engineering and Germany\'s Leopoldina, and received the 2026 IEEE Hamming Medal.',
    ko:'1968년생으로 MIT의 NEC 석좌 교수이며 네트워크 코딩 및 신뢰 통신 연구 그룹을 이끕니다. 옵티멈의 핵심 기술인 RLNC의 공동 발명자이며 미국 공학한림원과 독일 레오폴디나 회원이고 2026년 IEEE 해밍 메달을 받았습니다.'},
  'KENT LIN':{
    vi:'Anh phụ trách adoption và tăng trưởng hệ sinh thái: business development, tokenomics và gọi vốn. Anh bỏ dở MBA Harvard để làm Optimum toàn thời gian, từng là Partner tại GSRV và sáng lập McKinsey Crypto DAO.',
    en:'He leads adoption and ecosystem growth: business development, tokenomics and fundraising. He left his Harvard MBA to build Optimum full time, was a Partner at GSRV and founded the McKinsey Crypto DAO.',
    ko:'생태계 도입과 성장, 즉 비즈니스 개발, 토크노믹스, 투자 유치를 맡고 있습니다. 하버드 MBA를 중단하고 옵티멈에 전념했으며, GSRV 파트너와 McKinsey Crypto DAO 창립자를 지냈습니다.'},
  'ELI LAIPSON':{
    vi:'Anh xây đội marketing cốt lõi, truyền thông các sản phẩm như flexnode và mump2p, và khuếch đại các cột mốc kỹ thuật của Optimum.',
    en:'He built the core marketing team, communicates products like flexnode and mump2p, and amplifies Optimum\'s technical milestones.',
    ko:'핵심 마케팅 팀을 꾸리고 flexnode와 mump2p 같은 제품을 알리며 옵티멈의 기술적 이정표를 널리 알리고 있습니다.'},
  'DAVID SONG':{
    vi:'Anh từng là Head of BD tại Cosmostation và phụ trách tăng trưởng khu vực châu Á – Thái Bình Dương: sự kiện, quan hệ với builder và validator, làm cầu nối giữa nghiên cứu RLNC và hệ sinh thái APAC.',
    en:'He was Head of BD at Cosmostation and drives growth in Asia-Pacific: events, builder and validator relations, and bridging RLNC research with the APAC ecosystem.',
    ko:'Cosmostation의 BD 총괄을 지냈으며, 이벤트와 빌더·검증자 관계를 통해 아시아·태평양 지역의 성장을 이끌고 RLNC 연구와 APAC 생태계를 연결합니다.'},
  'BLOCKCHAINJEFF':{
    vi:'Anh là admin cộng đồng Optimum: host các buổi community call, cập nhật sự kiện và kết nối thành viên với team. Anh làm marketing và cộng đồng Web3 khoảng chín năm.',
    en:'He is the Optimum community admin: he hosts the community calls, shares event updates and connects members with the team. He has worked in Web3 marketing and community for about nine years.',
    ko:'옵티멈 커뮤니티 관리자로서 커뮤니티 콜을 진행하고 행사 소식을 전하며 멤버와 팀을 이어 줍니다. Web3 마케팅과 커뮤니티 분야에서 약 9년간 일했습니다.'},
  'FLASH':{
    vi:'Anh giữ Discord, duyệt nội dung và hỗ trợ thành viên khi cần. Anh ở Đức, cũng đang moderator cho Ritual, trước đó từng làm cộng đồng cho Polyhedra, Redbelly, Aleo và Avalanche.',
    en:'He looks after Discord, reviews content and supports members when needed. Based in Germany, he also moderates for Ritual and previously did community work for Polyhedra, Redbelly, Aleo and Avalanche.',
    ko:'디스코드를 관리하고 콘텐츠를 검수하며 필요할 때 멤버를 도와줍니다. 독일에 살고 있으며 Ritual의 모더레이터도 맡고 있고, 이전에는 Polyhedra, Redbelly, Aleo, Avalanche의 커뮤니티를 담당했습니다.'},
  'ABBAS':{
    vi:'Anh viết thread giải thích RLNC, cách dữ liệu đi giữa các node, và vì sao Optimum là lớp hạ tầng chứ không phải một chain mới. Anh là người giải thích kỹ thuật cho cộng đồng.',
    en:'He writes threads explaining RLNC, how data travels between nodes, and why Optimum is an infrastructure layer rather than a new chain. He is the one who explains the technology to the community.',
    ko:'RLNC, 노드 사이에서 데이터가 이동하는 방식, 그리고 옵티멈이 새로운 체인이 아니라 인프라 계층인 이유를 설명하는 스레드를 씁니다. 커뮤니티에 기술을 풀어 주는 역할입니다.'},
  'CHANDLER OTTERBEIN':{
    vi:'Anh ở Optimum từ khá sớm, khoảng năm 2024. Trước đó anh là chủ tịch NEU Blockchain, từng làm tại Brown Brothers Harriman và ở student advisory board của Enterprise Ethereum Alliance. Anh phụ trách vận hành, nghiên cứu và cách dự án đi ra bên ngoài.',
    en:'He joined Optimum early, around 2024. Before that he was president of NEU Blockchain, worked at Brown Brothers Harriman, and served on the student advisory board of the Enterprise Ethereum Alliance. He handles operations, research and how the project reaches the outside world.',
    ko:'2024년경 비교적 초기에 옵티멈에 합류했습니다. 그 전에는 NEU Blockchain 회장을 지냈고 Brown Brothers Harriman에서 일했으며 Enterprise Ethereum Alliance 학생 자문위원회에도 참여했습니다. 운영, 리서치, 그리고 프로젝트를 외부에 알리는 일을 맡고 있습니다.'},
  'HAR PREET SINGH':{
    vi:'Anh dẫn dắt đội kỹ thuật, phần đưa mump2p chạy thật trên mạng. Trước Optimum, anh làm blockchain và hệ thống phân tán khoảng mười năm, từng ở Umee, Ignite tức Tendermint, và FIWARE. Anh là người biến nghiên cứu RLNC thành sản phẩm mà validator đang dùng.',
    en:'He leads the engineering team, the part that makes mump2p run for real on the network. Before Optimum he spent about ten years in blockchain and distributed systems, at Umee, Ignite (formerly Tendermint) and FIWARE. He turned the RLNC research into a product that validators actually use.',
    ko:'엔지니어링 팀을 이끌며 mump2p가 실제 네트워크에서 돌아가게 만드는 일을 맡고 있습니다. 옵티멈 이전에는 약 10년간 블록체인과 분산 시스템 분야에서 Umee, Ignite(Tendermint), FIWARE 등을 거쳤습니다. RLNC 연구를 검증자들이 실제로 쓰는 제품으로 만든 사람입니다.'},
  'ALAN SUNNY':{
    vi:'Ông phụ trách hỗ trợ kỹ thuật cho khách hàng: làm cầu nối giữa đội nghiên cứu, engineering và các validator, node operator, team chain đang tích hợp Optimum, hướng dẫn triển khai và xử lý sự cố. Trước Optimum, ông làm Technical Customer Success ở Obol, và kỹ sư node, blockchain ở Blockdaemon và Ankr. Ông ở Newcastle, nước Anh.',
    en:'He runs technical support for customers: he is the bridge between the research and engineering teams and the validators, node operators and chain teams integrating Optimum, helping with deployment and troubleshooting. Before Optimum he did Technical Customer Success at Obol, and was a node and blockchain engineer at Blockdaemon and Ankr. He is based in Newcastle, UK.',
    ko:'고객 기술 지원을 맡고 있으며, 연구·엔지니어링 팀과 옵티멈을 도입하는 검증자, 노드 운영자, 체인 팀 사이를 이어 주고 배포 안내와 문제 해결을 돕습니다. 옵티멈 이전에는 Obol에서 Technical Customer Success를, Blockdaemon과 Ankr에서 노드·블록체인 엔지니어로 일했습니다. 영국 뉴캐슬에 있습니다.'},
  'SAJIDA ZOUARHI':{
    vi:'Cô có hơn 10 năm trong crypto, từng làm product, research và strategy tại ConsenSys, Tezos và Blocknative. Ở Optimum, cô đưa OptimumP2P và mump2p ra validator để block lan nhanh và ổn định hơn mà không đụng consensus.',
    en:'She has over 10 years in crypto, with product, research and strategy roles at ConsenSys, Tezos and Blocknative. At Optimum she brings OptimumP2P and mump2p to validators, so blocks propagate faster and more reliably without touching consensus.',
    ko:'크립토 경력 10년 이상으로, ConsenSys, Tezos, Blocknative에서 제품, 리서치, 전략 업무를 맡았습니다. 옵티멈에서는 OptimumP2P와 mump2p를 검증자에게 제공해, 합의는 건드리지 않고 블록을 더 빠르고 안정적으로 전파합니다.'},
  'KISHORI KONWAR':{
    vi:'Ông có chuyên môn sâu về distributed systems, coding theory và AI. Trước Optimum, ông từng là Senior Engineer & Scientist tại Meta, làm postdoc về Network Coding tại MIT và làm quant tại Goldman Sachs. Cùng Prof. Muriel Médard và Kent Lin, ông đồng sáng lập Optimum năm 2024 để đưa RLNC vào hạ tầng dữ liệu blockchain, tập trung vào tốc độ lan truyền và hiệu quả băng thông.',
    en:'He brings deep expertise in distributed systems, coding theory and AI. Before Optimum he was a Senior Engineer & Scientist at Meta, did a postdoc on Network Coding at MIT, and worked as a quant at Goldman Sachs. With Prof. Muriel Médard and Kent Lin, he co-founded Optimum in 2024 to bring RLNC into blockchain data infrastructure, focusing on propagation speed and bandwidth efficiency.',
    ko:'분산 시스템, 코딩 이론, AI에 깊은 전문성을 갖고 있습니다. 옵티멈 이전에는 Meta에서 시니어 엔지니어 겸 사이언티스트로 일했고, MIT에서 네트워크 코딩 박사후 연구를 마쳤으며, 골드만삭스에서 퀀트로 근무했습니다. Muriel Médard 교수, Kent Lin과 함께 2024년 옵티멈을 공동 창업해 RLNC를 블록체인 데이터 인프라에 도입했고, 전파 속도와 대역폭 효율에 집중합니다.'},
  'NANCY LYNCH':{
    vi:'Bà là cố vấn học thuật gắn trực tiếp với nền tảng kỹ thuật của dự án, và là cựu NEC Chair tại MIT, người giữ ghế này trước Prof. Muriel Médard. Năm 1985 bà công bố chứng minh toán học đầu tiên về Byzantine Fault Tolerance, tính chất an toàn mà mọi giao thức consensus blockchain đều dựa vào. Năm 1988 bà đưa ra thuật toán DLS, tiền thân của Tendermint và các nhánh consensus sau này, trong đó có Ethereum.',
    en:'She is an academic advisor tied directly to the project\'s technical foundations, and a former NEC Chair at MIT, holding the chair before Prof. Muriel Médard. In 1985 she published the first mathematical proof of Byzantine Fault Tolerance, the safety property every blockchain consensus protocol relies on. In 1988 she introduced the DLS algorithm, a forerunner of Tendermint and later consensus lines, Ethereum among them.',
    ko:'프로젝트의 기술적 기반과 직결된 학술 자문역이며, MIT NEC 석좌교수직을 Muriel Médard 교수보다 먼저 맡았습니다. 1985년 모든 블록체인 합의 프로토콜이 의존하는 안전 속성인 비잔틴 장애 허용(BFT)에 대한 최초의 수학적 증명을 발표했고, 1988년에는 Tendermint와 이후 합의 계열, 이더리움의 전신 격인 DLS 알고리즘을 제시했습니다.'},
  'SRIRAM VISWANATH':{
    vi:'Ông là cố vấn học thuật gắn trực tiếp với nền tảng kỹ thuật của dự án. Ông có B.Tech tại IIT Madras, M.S. tại Caltech và PhD tại Stanford, đều ngành điện. Ông nghiên cứu information theory, truyền thông không dây và network science, từng nhận NSF CAREER Award và giải IEEE IT/ComSoc Best Paper Award năm 2005.',
    en:'He is an academic advisor tied directly to the project\'s technical foundations. He holds a B.Tech from IIT Madras, an M.S. from Caltech and a PhD from Stanford, all in electrical engineering. His research covers information theory, wireless communications and network science, and he has received an NSF CAREER Award and the 2005 IEEE IT/ComSoc Best Paper Award.',
    ko:'프로젝트의 기술적 기반과 직결된 학술 자문역입니다. IIT Madras에서 B.Tech, Caltech에서 석사, Stanford에서 박사 학위를 모두 전기공학 분야로 받았습니다. 정보 이론, 무선 통신, 네트워크 과학을 연구하며 NSF CAREER Award와 2005년 IEEE IT/ComSoc 최우수 논문상을 받았습니다.'}
};
const T={
  vi:{greet:['Xin chào, tôi là hướng dẫn viên của khu triển lãm Optimum.','Bạn cứ nhìn vào bức tranh nào, tôi sẽ giới thiệu bức tranh đó.'],
      intro:['Đây là {n}.','Bức chân dung này là của {n}.','Bạn đang xem chân dung của {n}.'],
      ceo:'{n} là CEO của Optimum, người dẫn dắt định hướng của cả đội ngũ.',
      founder:'{n} là đồng sáng lập của Optimum, người cùng đặt nền móng cho dự án.',
      cmo:'{n} là CMO của Optimum, phụ trách marketing và truyền thông.',
      apac:'{n} là APAC Growth Lead của Optimum, phụ trách tăng trưởng khu vực châu Á – Thái Bình Dương.',
      admin:'{n} là admin cộng đồng của Optimum, kết nối thành viên với đội ngũ.',
      mod:'{n} là lead moderator của Optimum, giữ Discord và hỗ trợ cộng đồng.',
      amb:'{n} là Tech Ambassador của Optimum, người giải thích kỹ thuật cho cộng đồng.',
      eng:'{n} là VP Engineering của Optimum, dẫn dắt đội kỹ thuật.',
      ops:'{n} phụ trách Strategy & Operations của Optimum, tức chiến lược và vận hành.',
      tcsm:'{n} là Head of TCSM của Optimum, phụ trách hỗ trợ kỹ thuật cho khách hàng.',
      cpo:'{n} là Chief Product Officer của Optimum, phụ trách sản phẩm.',
      team:'{n} là thành viên trong đội ngũ Optimum.',
      proj:'Optimum là hạ tầng bộ nhớ hiệu năng cao cho mọi blockchain, xây trên công nghệ RLNC đến từ MIT.',
      outro:['Mời bạn xem tiếp các bức tranh bên cạnh.','Bạn có thể bước tiếp để xem thêm.'],
      name:'Hướng dẫn viên', langName:'tiếng Việt', tts:'vi-VN'},
  en:{greet:['Hello, I am the guide of the Optimum exhibition.','Look at any painting and I will tell you about it.'],
      intro:['This is {n}.','This portrait shows {n}.','You are looking at the portrait of {n}.'],
      ceo:'{n} is the CEO of Optimum, leading the direction of the whole team.',
      founder:'{n} is a co-founder of Optimum, who helped lay the foundation of the project.',
      cmo:'{n} is the CMO of Optimum, in charge of marketing and communications.',
      apac:'{n} is the APAC Growth Lead of Optimum, driving growth across Asia-Pacific.',
      admin:'{n} is the community admin of Optimum, connecting members with the team.',
      mod:'{n} is the lead moderator of Optimum, looking after Discord and supporting the community.',
      amb:'{n} is the Tech Ambassador of Optimum, explaining the technology to the community.',
      eng:'{n} is the VP of Engineering at Optimum, leading the engineering team.',
      ops:'{n} is in charge of Strategy and Operations at Optimum.',
      tcsm:'{n} is the Head of TCSM at Optimum, in charge of technical support for customers.',
      cpo:'{n} is the Chief Product Officer at Optimum, in charge of product.',
      team:'{n} is a member of the Optimum team.',
      proj:'Optimum is high-performance memory infrastructure for any blockchain, built on RLNC technology from MIT.',
      outro:['Feel free to continue to the next paintings.','Step along to see more.'],
      name:'Guide', langName:'English', tts:'en-US'},
  ko:{greet:['안녕하세요, 옵티멈 전시관의 안내원입니다.','보고 싶은 그림을 바라보시면 제가 소개해 드릴게요.'],
      intro:['이분은 {n}님입니다.','이 초상화는 {n}님입니다.'],
      ceo:'{n}님은 옵티멈의 CEO로서 팀 전체의 방향을 이끌고 있습니다.',
      founder:'{n}님은 옵티멈의 공동 창업자로서 프로젝트의 토대를 함께 만들었습니다.',
      cmo:'{n}님은 옵티멈의 CMO로서 마케팅과 커뮤니케이션을 맡고 있습니다.',
      apac:'{n}님은 옵티멈의 APAC 성장 리드로서 아시아·태평양 지역의 성장을 이끌고 있습니다.',
      admin:'{n}님은 옵티멈의 커뮤니티 관리자로서 멤버와 팀을 이어 주고 있습니다.',
      mod:'{n}님은 옵티멈의 리드 모더레이터로서 디스코드를 관리하고 커뮤니티를 돕고 있습니다.',
      amb:'{n}님은 옵티멈의 테크 앰배서더로서 커뮤니티에 기술을 설명하고 있습니다.',
      eng:'{n}님은 옵티멈의 엔지니어링 총괄 VP로서 개발팀을 이끌고 있습니다.',
      ops:'{n}님은 옵티멈의 전략 및 운영을 맡고 있습니다.',
      tcsm:'{n}님은 옵티멈의 Head of TCSM으로서 고객 기술 지원을 맡고 있습니다.',
      cpo:'{n}님은 옵티멈의 최고 제품 책임자(CPO)입니다.',
      team:'{n}님은 옵티멈 팀의 일원입니다.',
      proj:'옵티멈은 MIT에서 나온 RLNC 기술로 만든, 모든 블록체인을 위한 고성능 메모리 인프라입니다.',
      outro:['다음 그림도 둘러보세요.'],
      name:'안내원', langName:'한국어', tts:'ko-KR'}
};
const NATIVE={vi:1,en:1,ko:1};
const TTSL={vi:'vi-VN',en:'en-US',ru:'ru-RU',ng:'en-NG',bn:'bn-BD',id:'id-ID',hi:'hi-IN',zh:'zh-CN',fil:'fil-PH',uk:'uk-UA',ko:'ko-KR'};
const TT=lang=>T[lang]||T.en;                       // bộ kịch bản gốc của ngôn ngữ (không có -> tiếng Anh)
const tr1=async(lang,s)=>(NATIVE[lang]||typeof trLine!=='function')?s:await trLine(s);   // dịch bằng trLine của boss-talk.js
const trAll=(lang,a)=>Promise.all(a.map(x=>tr1(lang,x)));
const langName=lang=>{try{return LN.find(x=>x[0]===lang)[1]}catch(e){return lang}};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const title=s=>String(s).toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase()).replace(/\b(Ceo|Cmo|Apac|Vp)\b/g,m=>m.toUpperCase());
const kindOf=r=>/TCSM/i.test(r)?'tcsm':/PRODUCT OFFICER|CPO/i.test(r)?'cpo':/CEO/i.test(r)?'ceo':/FOUNDER/i.test(r)?'founder':/CMO/i.test(r)?'cmo':/APAC/i.test(r)?'apac':/ENGINEER/i.test(r)?'eng':/ADMIN/i.test(r)?'admin':/MODERATOR/i.test(r)?'mod':/AMBASSADOR/i.test(r)?'amb':/STRATEGY|OPERATIONS/i.test(r)?'ops':'team';
function getLang(){return typeof L!=='undefined'?L:'vi'}   // L = ngôn ngữ đang chọn (i18n.js)
function template(info,lang){
  const k=keyOf(info),t=TT(lang),n=SPOKEN[k]||title(info.n1),bio=BIO[k]&&(BIO[k][lang]||BIO[k].en);
  const out=[pick(t.intro).replace('{n}',n),t[kindOf(info.n2)].replace('{n}',n)];
  if(bio)out.push(bio);
  out.push(t.proj);
  if(Math.random()<.5)out.push(pick(t.outro));
  return out;
}
// ---- AI (Groq) qua AITalk của ai-talk.js: tái dùng xoay key / dự phòng / lọc câu (clean) của bạn ----
// AITalk.line(kind,b) tự dựng prompt từ AIP[kind] và thêm "Ngôn ngữ: {lang}" theo L, nên chỉ cần đăng ký AIP.guide rồi gọi line('guide',...).
// sys được dựng ĐỒNG BỘ ngay đầu line() (trước await đầu tiên) nên gán AIP.guide rồi gọi liền là an toàn khi có nhiều yêu cầu chạy cùng lúc.
const STYLES=[
  'kể như một câu chuyện ngắn, đi từ xuất phát điểm của người này đến Optimum',
  'mở đầu bằng thành tựu nổi bật nhất rồi quay về vai trò hiện tại trong Optimum',
  'mở đầu bằng một câu hỏi gợi mở cho khách rồi trả lời bằng thông tin trong form',
  'súc tích, nhịp nhanh, như điểm nhấn của một hướng dẫn viên bảo tàng',
  'nhấn mạnh vai trò của người này trong sứ mệnh của Optimum',
  'đi theo thứ tự: con người, công việc, ý nghĩa đối với dự án'
];
const sample=(a,n)=>a.slice().sort(()=>Math.random()-.5).slice(0,n);
CFG.ai=async(info,lang)=>{
  if(typeof AITalk==='undefined'||typeof AIP==='undefined')return null;
  const k=keyOf(info),n=SPOKEN[k]||title(info.n1),f=FACTS[k],bio=BIO[k]&&BIO[k].vi||'';
  const facts=f||bio||'';
  const focus=f?sample(f.split(/(?<=[.;])\s+/).filter(x=>x.length>25),3):[];   // mỗi lần ưu tiên nhắc 3 ý khác nhau -> lời thuyết minh khác nhau nhưng vẫn đúng ý chính
  // "FORM" gửi cho AI phân tích: tên + chức vụ + dữ kiện đã xác thực -> AI viết lời thuyết minh
  AIP.guide={
    head:`Bạn là hướng dẫn viên chuyên nghiệp của khu triển lãm Optimum, đang đứng trước bức chân dung của một thành viên dự án Optimum và thuyết minh cho khách tham quan. Giọng ấm áp, tự tin, mạch lạc như một người dẫn tour thật.
Hãy PHÂN TÍCH FORM sau rồi viết lời thuyết minh 5-7 câu (tổng 80-120 từ) theo thứ tự ý chính: giới thiệu tên và chức vụ; người này là thành viên của dự án Optimum và vai trò; 3-4 thông tin nổi bật trong form; nối về dự án Optimum bằng 1 câu.
[FORM]
Tên: ${n}
Chức vụ: ${title(info.n2)}
Dự án: Optimum (x.com/get_optimum)
Dữ kiện đã xác thực về người này: ${facts||'(chưa có dữ kiện cá nhân nào)'}
Dữ kiện về dự án: ${COMMON}
[/FORM]
MỖI LẦN MỘT KIỂU: lần này kể theo phong cách "${pick(STYLES)}".${focus.length?' Ưu tiên nhắc các ý sau (diễn đạt lại bằng lời của bạn): '+focus.join(' | ')+'.':''} Không cần đọc hết form, hãy chọn ý khác nhau mỗi lần, nhưng PHẢI giữ đúng ý chính (tên, chức vụ, thành viên Optimum, vai trò) và không sai lệch dữ kiện.
QUY TẮC: chỉ dùng dữ kiện có trong FORM. Nếu mục "Dữ kiện đã xác thực về người này" trống hoặc form dặn không suy diễn thì TUYỆT ĐỐI không bịa tiểu sử, trường học, công ty cũ, tuổi hay thành tích; chỉ nói tên, chức vụ, người đó là thành viên dự án Optimum và giới thiệu dự án từ "Dữ kiện về dự án". Mỗi câu trọn ý và kết thúc bằng dấu chấm. Không markdown, không ngoặc kép, không emoji, không gạch đầu dòng. Chỉ trả về lời thuyết minh.
`,
    combat:'',info:''};
  return AITalk.line('guide',{hp:1,maxhp:1,x:0,z:0,fl:0});   // trả null khi hết key / hết hạn mức / mất mạng
};
const CACHE={},PEND={},TPL={};
const tplLines=(info,lang)=>{const k=keyOf(info)+'|'+lang;return TPL[k]||(TPL[k]=trAll(lang,template(info,lang)))};   // kịch bản mẫu đã dịch, nhớ lại
const splitS=t=>{const a=t.replace(/\s+/g,' ').trim().match(/[^.!?。！？]+[.!?。！？…]?/g);return a?a.map(x=>x.trim()).filter(Boolean).slice(0,9):[]};
function ensure(info,lang){   // tạo (hoặc dùng lại) yêu cầu AI cho 1 tranh + ngôn ngữ; kết quả vào CACHE
  const key=keyOf(info)+'|'+lang;
  if(CACHE[key])return Promise.resolve(CACHE[key]);
  if(PEND[key])return PEND[key];
  const p=(async()=>{
    try{
      const t=typeof CFG.ai==='function'?await CFG.ai(info,lang):null;
      const l=t&&typeof t==='string'?splitS(t):[];
      if(l.length)return CACHE[key]=l;
      if(typeof CFG.ai!=='function')return CACHE[key]=await tplLines(info,lang);
    }catch(e){}
    return null;                                   // AI không khả dụng: không cache, lần sau thử lại
  })();
  PEND[key]=p;p.then(()=>{delete PEND[key]});
  return p;
}
// Lấy lời đọc: AI nếu kịp (chờ tối đa 2.5s; AI vẫn chạy nền để lần sau có sẵn), không thì kịch bản mẫu (đã dịch bằng trLine nếu không phải vi/en/ko)
const getLines=(info,lang,wait)=>Promise.race([ensure(info,lang),new Promise(r=>setTimeout(()=>r(null),wait||2500))])
  .then(r=>r||tplLines(info,lang));
// Làm nóng trước: khi người chơi bước lên sảnh, nhờ AI viết sẵn lời cho cả 8 tranh (cách nhau 0.7s) -> nhìn vào tranh là đọc ngay
let warmLang=null;
function warm(g){   // gọi khi người chơi lại gần chòi (<45m) hoặc đổi ngôn ngữ: viết sẵn lời bằng AI + dịch sẵn kịch bản mẫu cho cả 8 tranh
  const lang=GuideBot.getLang();if(warmLang===lang)return;warmLang=lang;
  g.easels.forEach((e,i)=>setTimeout(()=>{tplLines(e,lang);ensure(e,lang)},i*500));
  trAll(lang,TT(lang).greet);tr1(lang,TT(lang).name);
}

// ---------- KHUNG CHỮ ----------
// Giống khung thoại của bot/boss (class 'bt' của boss-talk.js): trên đầu hướng dẫn viên; nếu bot ra ngoài màn hình thì hiện phụ đề ở dưới.
const bub=document.createElement('div');bub.className='bt';
bub.style.cssText='position:fixed;left:0;top:0;z-index:3;display:none;pointer-events:none;background:#000;color:#fff;font:700 13px/1.4 sans-serif;padding:7px 12px;border-radius:8px;max-width:340px;text-align:center;transform-origin:50% 100%';
const bubHead=document.createElement('div'),bubBody=document.createElement('div');
bubHead.style.cssText='font-size:11px;color:#ffd070;margin-bottom:2px';
bub.appendChild(bubHead);bub.appendChild(bubBody);document.body.appendChild(bub);
const sub=document.createElement('div');
sub.style.cssText='position:fixed;left:50%;bottom:150px;transform:translateX(-50%);max-width:min(640px,86vw);padding:10px 16px;border-radius:14px;background:rgba(0,0,0,.8);color:#fff;font:700 15px/1.45 sans-serif;text-align:center;pointer-events:none;z-index:3;display:none';
const subHead=document.createElement('div'),subBody=document.createElement('div');
subHead.style.cssText='font-size:12px;color:#ffd070;margin-bottom:3px';
sub.appendChild(subHead);sub.appendChild(subBody);document.body.appendChild(sub);
let showing=false;const setHead=t=>{bubHead.textContent=t;subHead.textContent=t},setBody=t=>{bubBody.textContent=t;subBody.textContent=t};
const _hp=new THREE.Vector3();
function placeBubble(g){
  if(!showing){bub.style.display='none';sub.style.display='none';return}
  _hp.set(st.x,g.FL+2.35,st.z);const d=_hp.distanceTo(C.position);_hp.project(C);
  const on=_hp.z<1&&Math.abs(_hp.x)<.95&&_hp.y>-.9&&_hp.y<.95&&d<30;
  if(on){
    const sc=Math.max(.7,Math.min(1.2,12/d));
    bub.style.display='block';sub.style.display='none';
    bub.style.transform='translate('+(_hp.x*.5+.5)*innerWidth+'px,'+(-_hp.y*.5+.5)*innerHeight+'px) translate(-50%,-100%) translate(0,'+(-10*sc)+'px) scale('+sc+')';
  }else{bub.style.display='none';sub.style.display='block'}
}

// ---------- MÔ HÌNH VOXEL ----------
const SKIN=0xf1c9a5,HAIR=0x24170f,COAT=0x1f2d4a,GOLD=0xe8c04a,PANT=0x2b2b33,SHOE=0x3a2412,CYAN=0x7fe9ff;
const part=fn=>{const v=new VB();fn(v);return v.mesh()};
const bx=(v,x,y,z,w,h,d,c,s)=>v.box(x,y,z,w,h,d,c,s||.1);
// Logo vòng ∞ dạng KHỐI VOXEL: ảnh gốc được lấy mẫu thành lưới 40x24 ô (mỗi ô 1 khối màu, nhúng sẵn dạng base64 RGB) rồi dựng thành 1 tấm khối mỏng trên ngực / lưng áo.
const LOGO_C=40,LOGO_R=24;
const LOGO_RGB=Uint8Array.from(atob("KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw2KCw2KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1Jyw1KSw1NDY+VFdbdHZ4foCCd3l8W11hOT1DKC02Jyw2KCw1KCw1KCw1KCw1Jyw1KCw2MTU8UlRXc3V5f4GEfn+DZmlsQkRLKi02KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1MzU8ampsk5SUlpeVjo6OkJCQmJiYqKiosrCxi4uNP0FIKCw2KCw1KCw1KCw2MTM7bXBxqaqpvb29wMDAxsbGzc3N1dbU0tPTp6eoTlBWKCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1PD5Cc3Nzfn1+fn5+g4ODioqLi4yMioqKiImIkI+QpqWmtLS0enx+S05TREdNYWRmmpqar66vvLq7xMPDwL+/vr+/xcXFzs7P1tbW4+Pj4ODgfX+CKS42KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1ODk9aGhod3d3fX19jY2NpqamsLCwnJyfjo+RkJGUmpqciIiHk5OTq6urtba1tLW1sLCwtra20NDPysrLp6eplpaYnZ2grK2trKysv7+/2tra5ubm7e/uhIaJKCw0KCw1KCw1KCw1KCw1KCw1KCw1KCw1Jy00LjE4WVlZc3NyfHx8nJycvr29foCDNzxCKCw1KCw1Jyw1LjE6XmJnjo+Qk5OTmZmZpaamurm6ysrKgIOIOTtEKCw1KCw1KCw1MTU8ZWdrl5iYrq6u4ODg6uvq8PDwYWNpJy01KCw1KCw1KCw1KCw1KCw1KCw1KCw0QkJFa2trdXV1lJSUzMzMYGNmKSw0KCw1KCw1KCw1KCw1KCw0KCw1LzI7X2Fmf4CEh4mMc3V4Oz1FKCw1KCw1KCw1KCw1KCw1KCw1KCw0PkFGf39/tra26Ojo8fHx0tPULDA4KCw1KCw1KCw1KCw1KCw1KCw1LC83VFNUb29veXl5zczMhIaJKC01KCw1KCw1KCw1KCw1KCw1KCw0KCw1KCw1KCw1KCw1Jyw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1R0pMg4KD2NjY7u7u+Pf3W11kKCw1KCw1KCw1KCw1KCw1KCw1MTU6X15db29viYmJ2NjZRUlOKCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1LTE5Zmdovb296Ojo+Pf2kZOXKCw1KCw1KCw1KCw1KCw1KCw1Njk9Y2NhcXJxn5+fxsfHLjI5KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KC01Wlxdp6en5eXl9PT0sbS2KCw1KCw1KCw1KCw1KCw1KCw1Njk9Y2NidHR0o6OjwcPDKy82KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KC00WFlao6Oj5+fn9fX1ubu9KCw1KCw1KCw1KCw1KCw1KCw1NDc7YF9ec3NzlZWV0dLTNzxCKCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KC00YGJjsrKy6+vr9vb1o6aoKCw1KCw1KCw1KCw1KCw1KCw1MDQ6V1ZWb29vgICA3d3cXF9jKCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1MjU8dnd2zc3N7u7u+Pj4d3l+KCw1KCw1KCw1KCw1KCw1KCw1KS01SkpLa2trdHR0s7OzsbGyNDg/KCw1KCw1KCw1KCw1KCw1KCw1KCw3Jy01KS01MTU9NDhAKi82Jy01KCw1KCw1KCw1KCw1KCw1KCw1KSw1Ki41Xl9hnp6d4eHh7+/v7OzsPkFIKCw1KCw1KCw1KCw1KCw1KCw1Jy00OTtAXl5eb29vfHx8wsLClJWWOT1DKCw1KCw1KCw1KCw1KCw1LDE4XF9jlJWWrq+uvLy9tre3fX+CNjpCKCw1KCw1KCw1KCw1KCw1LTE4YWJknJyczs7O5ubm8/Pzl5ibJy01KCw1KCw1KCw1KCw1KCw1KCw1KCw1KS01Tk5RZ2dncnJygICAsbGxrq6ubG9xRUdOOT1DPkJHXl9ljY6PlpeWmZmZoKCgo6Okr6+v0NDQw8XFc3R5RklQOj5FPkFIWVxflJWVtLS0zczM3t7e6+3syMjKMzc/KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1LjI6Y2NlbGxsdXV1f39/k5OTrKyssrKyr6+vrKysoaCglJOToqKitra2qauspKanq6ysm5uburm50dDRy8vLwsLCwcHBxsbGxcXF09PT3d3d5ubm0NHSRUlQKCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1LjM6cnR2hISEdXV1fHx9gYGBhYWFiYmJjI2NlZOUsLGxn6CiQkdNKCw0KCw1NzxChoeKpqenoqGitra2wMDAw8PDycnJ0NDQ1tbW2tnatbW3QUVMKCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1Jy01UFRZi4yQoKGhn5+en5+fpqamr6+vmZueWV1kKC02KCw2KCw1KCw1KCw2KCw2R0tSjI+Sr6+vubm5u7u7w8PDxsfGqKmsaGlvKi42KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1Ky83PEBIQ0dPPkJKLDA4KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1Ki42Oz9HSExUQkdOLzM7KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1KCw1"),c=>c.charCodeAt(0));
// dir=+1: mặt trước (+z) · dir=-1: mặt sau (-z, lật ngang để logo vẫn đọc đúng khi nhìn từ phía sau). w,h: kích thước tấm (m)
function logoV(v,cx,cy,z,w,h,dir){
  const px=w/LOGO_C;
  bx(v,cx,cy,z*dir,w,h,.01,(i,j,k,nx,ny)=>{
    let c=Math.min(LOGO_C-1,Math.floor(i*LOGO_C/nx));if(dir<0)c=LOGO_C-1-c;
    const r=Math.min(LOGO_R-1,Math.floor((ny-1-j)*LOGO_R/ny)),o=(r*LOGO_C+c)*3;
    return (LOGO_RGB[o]<<16)|(LOGO_RGB[o+1]<<8)|LOGO_RGB[o+2];
  },px);
}
// dựng 1 người voxel; o = {coat,pant,hair,skin,tie,cap,long,shoe,belt,logo,capColor}: hướng dẫn viên chính có mũ vàng, nhân viên phụ mặc vest khác màu (không mũ)
function makeBot(o){
  o=o||{};const coat=o.coat??COAT,pant=o.pant??PANT,hair=o.hair??HAIR,skin=o.skin??SKIN;
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const mk=(m,x,y,z,p)=>{const g=new THREE.Group();g.position.set(x,y,z);g.add(m);(p||body).add(g);return g};
  const legL=mk(part(v=>{bx(v,0,-.35,0,.2,.7,.2,pant);bx(v,0,-.75,.05,.2,.1,.3,o.shoe??SHOE)}),-.12,.8,0);
  const legR=mk(part(v=>{bx(v,0,-.35,0,.2,.7,.2,pant);bx(v,0,-.75,.05,.2,.1,.3,o.shoe??SHOE)}),.12,.8,0);
  const armL=mk(part(v=>{bx(v,0,-.3,0,.15,.6,.15,coat);bx(v,0,-.65,0,.15,.1,.15,skin)}),-.35,1.35,0);
  const armR=mk(part(v=>{bx(v,0,-.3,0,.15,.6,.15,coat);bx(v,0,-.65,0,.15,.1,.15,skin)}),.35,1.35,0);
  mk(part(v=>{bx(v,0,1.1,0,.5,.6,.3,coat);bx(v,0,.85,.16,.5,.1,.02,o.belt??GOLD,.02);
    if(!o.logo)bx(v,.12,1.2,.16,.12,.08,.02,0xffffff,.02);   // khăn túi ngực (bộ đồng phục logo thì thay bằng logo)
    bx(v,0,1.33,.155,.14,.08,.02,0xf4f4f4,.02);
    if(o.logo){logoV(v,.135,1.2,.155,.2,.12,1);logoV(v,0,1.15,.155,.28,.168,-1)}   // logo ngực (bên phải ảnh nhìn từ phía trước, né cà vạt) + logo giữa lưng
    if(o.tie){bx(v,0,1.15,.162,.05,.32,.02,o.tie,.02);if(o.logo)bx(v,0,1.31,.164,.07,.06,.02,o.tie,.02)}   // cà vạt (+ nút thắt)
  }),0,0,0);
  const head=mk(part(v=>{
    bx(v,0,.25,0,.4,.4,.4,skin);
    bx(v,0,.4,-.02,.44,.12,.44,hair,.04);bx(v,0,.2,-.2,.44,.3,.06,hair,.04);
    if(o.long){bx(v,0,-.02,-.2,.44,.5,.06,hair,.04);bx(v,-.23,.12,-.06,.05,.4,.3,hair,.04);bx(v,.23,.12,-.06,.05,.4,.3,hair,.04)}   // tóc dài
    if(o.cap!==false){bx(v,0,.5,0,.46,.1,.46,o.capColor??coat,.05);bx(v,0,.5,.26,.3,.04,.1,GOLD,.02)}      // mũ hướng dẫn viên
    bx(v,-.09,.27,.205,.06,.06,.02,0x111111,.02);bx(v,.09,.27,.205,.06,.06,.02,0x111111,.02);
    bx(v,-.23,.25,0,.04,.1,.1,CYAN,.02);bx(v,.23,.25,0,.04,.1,.1,CYAN,.02);   // tai nghe
  }),0,1.4,0);
  const mouth=mk(part(v=>bx(v,0,0,0,.1,.03,.02,0x8a2b2b,.01)),0,.15,.205,head);
  return{root,body,legL,legR,armL,armR,head,mouth};
}
// HƯỚNG DẪN VIÊN CHÍNH: sơ mi trắng, cà vạt xanh navy, quần + giày đen, logo giữa ngực và giữa lưng (nhân viên phụ giữ nguyên đồ cũ)
const GUIDE_LOOK={coat:0xf3f5fb,pant:0x15151b,shoe:0x0e0e12,belt:0x0e0e12,tie:0x1b2038,logo:true,capColor:COAT};
const MAIN=makeBot(GUIDE_LOOK),{root,body,legL,legR,armL,armR,head,mouth}=MAIN;
root.visible=false;S.add(root);

// ---- 3 NHÂN VIÊN PHỤ: đi tuần trong dải riêng của mỗi người, dừng lại ngắm tranh gần nhất, quay sang khách khi khách đến gần (không đọc thoại) ----
const STAFF=[
  {look:{coat:0x24324f,hair:0x15110d,skin:0xe3b78f,tie:0xb23a3a,cap:false},band:[-15,-6]},
  {look:{coat:0x30333c,pant:0x23252b,hair:0x5a3a22,skin:0xf1c9a5,cap:false,long:true},band:[-4.5,4.5]},
  {look:{coat:0x1d3b4a,hair:0x1c1c1c,skin:0xc99872,tie:0xe8c04a,cap:false},band:[6,15]}
].map((d,i)=>{const m=makeBot(d.look);m.root.visible=false;S.add(m.root);return{m,band:d.band,x:0,z:0,yaw:0,hy:0,init:false,wp:null,wait:1+i*1.7,ph:i*2,focus:null,gesture:0}});

// ---------- TRẠNG THÁI ----------
const st={x:0,z:0,yaw:0,headYaw:0,init:false,wp:null,wait:0,walkPh:0,pointK:0,onDeck:false,
  gaze:-1,gazeT:0,speaking:-1,talking:false,last:{},lastGreet:-1e9,t:0};
let token=0;
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const _p=new THREE.Vector3(),_d=new THREE.Vector3();
function view(){
  const c=typeof C!=='undefined'?C:null;   // C = camera trong core.js
  if(!c||!c.getWorldPosition)return null;
  c.getWorldPosition(_p);c.getWorldDirection(_d);
  return{x:_p.x,y:_p.y,z:_p.z,dx:_d.x,dy:_d.y,dz:_d.z};
}

// ---------- ĐỌC THOẠI ----------
function stopSpeech(){
  token++;st.speaking=-1;st.talking=false;showing=false;
  cancelTTS();
}
// ---- GIỌNG ĐỌC ----
// Ưu tiên: (1) giọng neural/"Natural"/"Online" đúng ngôn ngữ có trong máy (Edge, Windows 11, macOS...) → (2) giọng Google Dịch theo ngôn ngữ (CFG.cloudTTS) → (3) giọng thường đúng ngôn ngữ.
// KHÔNG BAO GIỜ đọc bằng giọng sai ngôn ngữ (đó là lý do trước đây tiếng Việt bị đọc bằng phát âm tiếng Anh).
let curAudio=null,VOICES=[];
const loadVoices=()=>{try{VOICES=speechSynthesis.getVoices()||[]}catch(e){}};
if(window.speechSynthesis){loadVoices();try{speechSynthesis.addEventListener('voiceschanged',loadVoices)}catch(e){}}
const normL=x=>String(x||'').toLowerCase().replace('_','-');
const GTTS={vi:'vi',en:'en',ru:'ru',ng:'en',bn:'bn',id:'id',hi:'hi',zh:'zh-CN',fil:'tl',uk:'uk',ko:'ko'};
function pickVoice(lang){
  const want=normL(TTSL[lang]||'en-US'),pri=want.split('-')[0];let best=null,bs=0;
  for(const v of VOICES){
    const vl=normL(v.lang);if(vl.split('-')[0]!==pri&&!(pri==='fil'&&vl.startsWith('tl')))continue;
    const neural=/natural|online|neural/i.test(v.name);
    let sc=(vl===want?10:6)+(neural?8:/google/i.test(v.name)?3:/microsoft|apple|siri/i.test(v.name)?2:0);
    if(sc>bs){bs=sc;best={v,neural}}
  }
  return best;
}
// Cách đọc riêng cho từ tiếng Anh / viết tắt (chữ hiển thị giữ nguyên)
const PRON={
  vi:[[/\bProf\.?(?=\s)/g,'Giáo sư'],[/\bBFT\b/g,'bi ép ti'],[/\bDLS\b/g,'đi eo ét'],[/\bDr\.?(?=\s)/g,'Tiến sĩ'],[/\bAPAC\b/g,'ây pác'],[/\bCMO\b/g,'xi em ô'],[/\bBD\b/g,'bi đi'],[/\bMBA\b/g,'em bi ây'],[/\bCEO\b/g,'xi i ô'],[/Optimum/gi,'Óp ti mầm'],[/mump2p/gi,'mum pi tu pi'],[/\bRLNC\b/g,'a eo en xi'],[/\bMIT\b/g,'em ai ti'],[/Blockchain/gi,'Blốc chen'],[/Block Arena/gi,'Blốc A ri na']],
  en:[[/\bProf\.?(?=\s)/g,'Professor'],[/\bDr\.?(?=\s)/g,'Doctor'],[/mump2p/gi,'mump two p']]
};
const pron=(t,lang)=>(PRON[lang]||[]).reduce((x,r)=>x.replace(r[0],r[1]),t);
function cancelTTS(){
  try{window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}
  if(curAudio){curAudio.onended=curAudio.onerror=null;try{curAudio.pause()}catch(e){}curAudio=null}
}
const chunks=(t,n)=>{const out=[];while(t.length>n){let i=t.lastIndexOf(' ',n);if(i<n*.4)i=n;out.push(t.slice(0,i).trim());t=t.slice(i).trim()}if(t)out.push(t);return out};
let cloudBadUntil=0;const TTSC={},NOTED={};
const note=(k,m)=>{if(!NOTED[k+m]){NOTED[k+m]=1;console.info('[GuideBot] '+k+': '+m)}};
const gUrls=[
  (q,tl)=>'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl='+tl+'&q='+q,
  (q,tl)=>'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl='+tl+'&q='+q
];
function mkAudio(url){const a=new Audio();a.referrerPolicy='no-referrer';a.preload='auto';a.src=url;return a}   // no-referrer: Google hay từ chối khi có Referer
// Tải trước âm thanh của câu kế tiếp (chỉ khi dùng giọng Google) để không bị hở giữa các câu
function preloadTTS(text,lang){
  try{
    if(!CFG.tts||!CFG.cloudTTS||Date.now()<cloudBadUntil)return;
    const pv=window.speechSynthesis?pickVoice(lang):null;if(pv&&pv.neural)return;
    const c=chunks(pron(text,lang),180)[0],k=lang+'|'+c;if(!c||TTSC[k])return;
    const a=mkAudio(gUrls[0](encodeURIComponent(c),GTTS[lang]||'en'));a.load();TTSC[k]=a;
  }catch(e){}
}
function startTTS(text,lang,tk,onDone,onNoVoice){   // gọi onDone khi đọc xong (hoặc không đọc được)
  const t2=pron(text,lang),pv=window.speechSynthesis?pickVoice(lang):null;
  let finished=false;const done=()=>{if(!finished){finished=true;onDone()}};
  const local=()=>{
    if(!pv){note('giọng '+lang,'không có giọng đúng ngôn ngữ trong máy và giọng Google không dùng được -> chỉ hiện chữ (gõ GuideBot.voices() trong Console để xem giọng có sẵn)');if(onNoVoice)onNoVoice();return done()}
    try{note('giọng '+lang,'dùng giọng trong máy: '+pv.v.name);const u=new SpeechSynthesisUtterance(t2);u.voice=pv.v;u.lang=pv.v.lang;u.rate=CFG.rate;u.pitch=1;u.onend=u.onerror=done;speechSynthesis.speak(u)}catch(e){done()}
  };
  if(CFG.cloudTTS&&(!pv||!pv.neural)&&Date.now()>=cloudBadUntil){
    const parts=chunks(t2,180);let i=0;
    const next=()=>{
      if(tk!==token||i>=parts.length)return done();
      const c=parts[i++],first=i===1,q=encodeURIComponent(c),tl=GTTS[lang]||'en',pk=lang+'|'+c;let u=0;
      const tryUrl=()=>{
        if(tk!==token)return done();
        let a=null;
        if(u===0&&TTSC[pk]){a=TTSC[pk];delete TTSC[pk]}                       // đã tải trước
        if(!a){
          if(u>=gUrls.length){cloudBadUntil=Date.now()+300000;note('giọng '+lang,'giọng Google lỗi (bị chặn / không có mạng), tạm tắt 5 phút');return first?local():done()}
          try{a=mkAudio(gUrls[u](q,tl))}catch(e){u++;return tryUrl()}
        }
        u++;curAudio=a;let bad=false;
        const fail=()=>{if(bad)return;bad=true;clearTimeout(to);tryUrl()};
        const to=setTimeout(fail,4500);                                          // 4.5s chưa phát được -> thử đường khác
        a.onplaying=()=>{clearTimeout(to);note('giọng '+lang,'dùng giọng Google Dịch')};
        a.onended=()=>{clearTimeout(to);cloudBadUntil=0;next()};a.onerror=fail;
        const pl=a.play();
        if(pl&&pl.catch)pl.catch(e=>{if(e&&e.name==='NotAllowedError'){bad=true;clearTimeout(to);first?local():done()}else fail()});
      };
      tryUrl();
    };
    next();
  }else local();
}
function say(text,tk,head,lang){
  return new Promise(res=>{
    if(tk!==token)return res();
    setHead(head);setBody('');showing=CFG.showText;   // mặc định chỉ đọc; không đọc được thì startTTS gọi lại để hiện chữ
    const dur=Math.max(1400,text.length*(CFG.tts?70/CFG.rate:55));
    let ttsDone=!CFG.tts,timeDone=false,shown=0;const t0=performance.now();
    if(CFG.tts)startTTS(text,lang,tk,()=>{ttsDone=true},()=>{showing=true});
    else showing=true;
    const iv=setInterval(()=>{
      if(tk!==token){clearInterval(iv);return res()}
      const el=performance.now()-t0,n=Math.min(text.length,Math.floor(text.length*Math.min(1,el/(dur*.85))));
      if(n!==shown){shown=n;setBody(text.slice(0,n))}
      if(el>=dur)timeDone=true;
      if((timeDone&&ttsDone)||el>dur+12000){clearInterval(iv);setBody(text);res()}
    },40);
  });
}
async function speakLines(lines,head,lang,idx){
  const tk=++token;cancelTTS();
  st.speaking=idx;st.talking=true;
  preloadTTS(lines[0],lang);
  for(let li=0;li<lines.length;li++){const l=lines[li];if(tk!==token)return;if(li+1<lines.length)preloadTTS(lines[li+1],lang);await say(l,tk,head,lang);if(tk!==token)return;await new Promise(r=>setTimeout(r,250))}
  if(tk!==token)return;
  st.talking=false;st.speaking=-1;setTimeout(()=>{if(tk===token)showing=false},1200);
}
async function speakPicture(idx,g){
  const info=g.easels[idx],lang=GuideBot.getLang(),mine=++token;   // ngắt câu đang đọc ngay, rồi mới chờ AI
  cancelTTS();
  st.last[idx]=st.t;st.speaking=idx;st.talking=false;
  const key=keyOf(info)+'|'+lang,lines=await getLines(info,lang);
  if(mine!==token)return;
  // dùng xong bản này thì bỏ đi và viết sẵn 1 bản KHÁC cho lần sau (mỗi lần đọc 1 kiểu)
  if(CACHE[key]===lines){delete CACHE[key];setTimeout(()=>{if(typeof CFG.ai==='function')ensure(info,lang)},1200)}
  if(TPL[key]){delete TPL[key];setTimeout(()=>tplLines(info,lang),500)}                       // trong lúc chờ AI đã bị ngắt / đổi tranh
  const nm=await tr1(lang,TT(lang).name);if(mine!==token)return;
  speakLines(lines,nm+' · '+(SPOKEN[keyOf(info)]||title(info.n1))+' — '+title(info.n2),lang,idx);
}

async function greet(){
  const l=GuideBot.getLang(),tk=token+1;
  const [g,nm]=await Promise.all([trAll(l,TT(l).greet),tr1(l,TT(l).name)]);
  if(token+1!==tk||!st.onDeck)return;   // đã đọc câu khác / người chơi đã rời sảnh
  speakLines(g,nm,l,-1);
}

// ---------- NHÌN TRANH ----------
function lookedEasel(P,g){
  let best=-1,bestA=1e9;
  for(let i=0;i<g.easels.length;i++){
    const e=g.easels[i],fx=e.fx||0,fz=e.fz===undefined?1:e.fz;   // (fx,fz) = hướng mặt tranh trên mặt phẳng ngang (kệ có thể xoay bất kỳ góc nào)
    const px=e.x+fx*.22,pz=e.z+fz*.22;                            // điểm trên mặt tranh
    const den=P.dx*fx+P.dz*fz;if(den>-.05)continue;               // phải nhìn ngược chiều mặt tranh
    const t=((px-P.x)*fx+(pz-P.z)*fz)/den;if(t<0||t>CFG.lookRange)continue;
    const hx=P.x+P.dx*t,hy=P.y+P.dy*t,hz=P.z+P.dz*t,hs=.5*(e.s||1);
    const lat=(hx-e.x)*fz-(hz-e.z)*fx;                            // khoảng lệch ngang dọc theo mặt tranh
    if(Math.abs(lat)>hs+CFG.lookMargin||Math.abs(hy-e.y)>hs+CFG.lookMargin)continue;
    const vx=e.x-P.x,vy=e.y-P.y,vz=pz-P.z,L=Math.hypot(vx,vy,vz)||1;
    const a=Math.acos(Math.max(-1,Math.min(1,(vx*P.dx+vy*P.dy+vz*P.dz)/L)));
    if(a<bestA){bestA=a;best=i}
  }
  return best;
}

// ---------- NHÂN VIÊN PHỤ ----------
function updateStaff(dt,g,P,on,clampZ){
  for(let n=0;n<STAFF.length;n++){
    const s=STAFF[n],m=s.m,x0=g.cx+s.band[0],x1=g.cx+s.band[1],z0=clampZ(-1e9)+.2,z1=clampZ(1e9)-.2;
    if(!s.init){s.x=x0+(x1-x0)*.5;s.z=(z0+z1)/2+(n-1)*.5;s.yaw=n*1.3;s.init=true}
    m.root.visible=true;
    let spd=0,face=null,tx=0,tz=0;
    if(s.wait>0){
      s.wait-=dt;
      if(s.wait<=0){   // chọn điểm đến mới trong dải của mình
        s.wp={x:x0+Math.random()*(x1-x0),z:z0+Math.random()*(z1-z0)};s.focus=null;s.gesture=0;
      }
    }else if(s.wp){
      tx=s.wp.x;tz=s.wp.z;const d=Math.hypot(tx-s.x,tz-s.z);
      if(d<.2){   // tới nơi: đứng lại, ngắm bức tranh gần nhất (nếu trong 5m)
        s.wp=null;s.wait=3+Math.random()*6;let bd=5,be=null;
        for(const e of g.easels){const dd=Math.hypot(e.x-s.x,e.z-s.z);if(dd<bd){bd=dd;be=e}}
        s.focus=be;s.gesture=Math.random()<.5?1:0;
      }else spd=CFG.walk*.85;
    }else s.wait=1;
    if(spd>0)face=Math.atan2(tx-s.x,tz-s.z);
    else{
      const dp=P?Math.hypot(P.x-s.x,P.z-s.z):1e9;
      if(on&&dp<6)face=Math.atan2(P.x-s.x,P.z-s.z);                       // khách đến gần: quay sang khách
      else if(s.focus)face=Math.atan2(s.focus.x-s.x,s.focus.z-s.z);      // không thì nhìn tranh
    }
    // tránh chồng lên hướng dẫn viên chính và người chơi
    const sx=s.x,sz=s.z;
    if(spd>0){const d=Math.hypot(tx-s.x,tz-s.z)||1,st2=Math.min(d,spd*dt);s.x+=(tx-s.x)/d*st2;s.z+=(tz-s.z)/d*st2}
    for(const [ox,oz,r] of[[st.x,st.z,.9],P&&on?[P.x,P.z,.7]:[1e9,1e9,0]]){const dx=s.x-ox,dz=s.z-oz,dd=Math.hypot(dx,dz);if(dd<r&&dd>.001){s.x=ox+dx/dd*r;s.z=oz+dz/dd*r}}
    for(let q=0;q<STAFF.length;q++)if(q!==n){const o2=STAFF[q],dx=s.x-o2.x,dz=s.z-o2.z,dd=Math.hypot(dx,dz);if(dd<.8&&dd>.001){s.x+=dx/dd*(.8-dd)*.5;s.z+=dz/dd*(.8-dd)*.5}}
    s.z=Math.max(z0,Math.min(z1,s.z));
    if(face!==null)s.yaw+=wrap(face-s.yaw)*Math.min(1,dt*6);
    const mv=spd>.05;
    s.ph+=spd*dt*2.4;
    const k=Math.min(1,spd/1.2),sw=Math.sin(s.ph)*k*.7,t=st.t+n*1.7,pt=s.gesture&&!mv&&s.focus?1:0;
    m.legL.rotation.x=sw;m.legR.rotation.x=-sw;
    m.armL.rotation.x=-sw*.8;
    m.armR.rotation.x=sw*.8*(1-pt)+(-1.2+Math.sin(t*2.2)*.06)*pt;    // thỉnh thoảng giơ tay chỉ vào tranh
    m.body.position.y=Math.abs(Math.sin(s.ph))*.04*k;
    const hy=face!==null&&!mv?Math.max(-.6,Math.min(.6,wrap(face-s.yaw))):0;s.hy+=(hy-s.hy)*Math.min(1,dt*8);
    m.head.rotation.y=s.hy;
    m.root.position.set(s.x,g.FL,s.z);m.root.rotation.y=s.yaw;
  }
}

// ---------- VÒNG LẶP ----------
function update(dt){
  const g=window.PavilionGuide;
  if(!g||!g.easels){root.visible=false;return}
  if(typeof curFl!=='undefined'&&curFl!==0){for(const s of STAFF)s.m.root.visible=false;root.visible=false;st.onDeck=false;if(showing||st.talking)stopSpeech();placeBubble(g);return}   // chòi chỉ có ở tầng 1 (curFl=0): sang tầng khác thì ẩn bot
  if(typeof playing!=='undefined'&&!playing){if(showing||st.talking)stopSpeech();placeBubble(g);return}   // menu / tạm dừng: bot đứng yên, ngừng đọc
  st.t+=dt;
  const zx0=g.cx-g.HX+CFG.xPad,zx1=g.cx+g.HX-CFG.xPad,zz0=g.cz+CFG.zMin,zz1=g.cz+CFG.zMax;
  const clampX=x=>Math.max(zx0,Math.min(zx1,x)),clampZ=z=>Math.max(zz0,Math.min(zz1,z));
  if(!st.init){st.x=g.cx;st.z=(zz0+zz1)/2;st.yaw=0;st.init=true}
  root.visible=true;

  const P=view();
  const on=!!P&&Math.abs(P.x-g.cx)<g.HX+.2&&Math.abs(P.z-g.cz)<g.HZ+.2&&P.y>g.FL+.8&&P.y<g.FL+3.3;
  if(on&&!st.onDeck&&st.t-st.lastGreet>60){st.lastGreet=st.t;greet()}
  if(P&&(on||Math.hypot(P.x-g.cx,P.z-g.cz)<45))warm(g);
  if(!on&&st.onDeck)stopSpeech();
  st.onDeck=on;
  updateStaff(dt,g,P,on,clampZ);

  // --- nhìn tranh ---
  if(on){
    const c=lookedEasel(P,g);
    if(c===st.gaze)st.gazeT+=dt;else{st.gaze=c;st.gazeT=0}
    if(c>=0&&st.gazeT>=CFG.dwell&&c!==st.speaking&&st.t-(st.last[c]??-1e9)>CFG.cooldown)speakPicture(c,g);
  }else{st.gaze=-1;st.gazeT=0}

  // --- di chuyển ---
  let tx,tz,spd=0,face=null;
  if(on){
    const fl=Math.hypot(P.dx,P.dz)||1,fx=P.dx/fl,fz=P.dz/fl,rx=-fz,rz=fx;
    let side=1,gx,gz;
    for(let k=0;k<2;k++){
      gx=clampX(P.x+rx*side*CFG.followDist+fx*.5);gz=clampZ(P.z+rz*side*CFG.followDist+fz*.5);   // đứng chếch phía trước-bên cạnh để luôn trong tầm nhìn
      if(Math.hypot(gx-P.x,gz-P.z)>.85)break;side=-side;
    }
    tx=gx;tz=gz;
    const d=Math.hypot(tx-st.x,tz-st.z);spd=d<.15?0:Math.min(CFG.run,d*3.2);
  }else{
    if(!st.wp||st.wait>0){
      if(st.wait>0){st.wait-=dt;if(st.wait<=0)st.wp=null}
      if(!st.wp&&st.wait<=0){st.wp={x:zx0+Math.random()*(zx1-zx0),z:zz0+.2+Math.random()*(zz1-zz0-.4)}}
    }
    if(st.wp&&st.wait<=0){
      tx=st.wp.x;tz=st.wp.z;const d=Math.hypot(tx-st.x,tz-st.z);
      if(d<.15){st.wait=1.5+Math.random()*2.5;spd=0}else spd=CFG.walk;
    }
  }
  const mv=spd>.05;
  if(mv){
    const d=Math.hypot(tx-st.x,tz-st.z)||1,step=Math.min(d,spd*dt);
    st.x=clampX(st.x+(tx-st.x)/d*step);st.z=clampZ(st.z+(tz-st.z)/d*step);
    face=Math.atan2(tx-st.x,tz-st.z);
  }
  if(on){   // không đứng chồng lên người chơi
    const ox=st.x-P.x,oz=st.z-P.z,od=Math.hypot(ox,oz);
    if(od<.7&&od>.001){st.x=clampX(P.x+ox/od*.7);st.z=clampZ(P.z+oz/od*.7)}
  }

  // --- hướng người / đầu / tay ---
  const present=on&&st.speaking>=0&&st.talking&&g.easels[st.speaking];
  let lookX=null,lookZ=null;
  if(present){const e=g.easels[st.speaking];lookX=e.x+(e.fx||0)*.22;lookZ=e.z+(e.fz===undefined?1:e.fz)*.22;face=Math.atan2(lookX-st.x,lookZ-st.z)}
  else if(on){lookX=P.x;lookZ=P.z;if(!mv)face=Math.atan2(P.x-st.x,P.z-st.z)}
  if(face!==null)st.yaw+=wrap(face-st.yaw)*Math.min(1,dt*8);
  const hy=lookX!==null?Math.max(-1,Math.min(1,wrap(Math.atan2(lookX-st.x,lookZ-st.z)-st.yaw))):0;
  st.headYaw+=(hy-st.headYaw)*Math.min(1,dt*10);

  // --- hoạt ảnh ---
  st.walkPh+=spd*dt*2.4;
  const k=Math.min(1,spd/1.2),sw=Math.sin(st.walkPh)*k*.7;
  st.pointK+=((present?1:0)-st.pointK)*Math.min(1,dt*8);
  legL.rotation.x=sw;legR.rotation.x=-sw;
  armL.rotation.x=-sw*.8+(st.talking&&!mv?-.35+Math.sin(st.t*4)*.15:0);
  armR.rotation.x=sw*.8*(1-st.pointK)+(-1.45+Math.sin(st.t*3)*.04)*st.pointK;
  body.rotation.x=spd>CFG.walk*1.5?.12:0;
  body.position.y=Math.abs(Math.sin(st.walkPh))*.04*k;
  head.rotation.y=st.headYaw;head.rotation.x=present?-.05:0;
  mouth.scale.y=st.talking?1+1.6*Math.abs(Math.sin(st.t*14)):1;

  root.position.set(st.x,g.FL,st.z);root.rotation.y=st.yaw;
  placeBubble(g);
}
let prev=performance.now();
(function loop(){requestAnimationFrame(loop);const n=performance.now(),dt=Math.min(.05,(n-prev)/1000);prev=n;try{update(dt)}catch(e){console.error('[GuideBot]',e)}})();

// ---------- API ----------
// AI: GuideBot.cfg.ai đã gắn sẵn với AITalk (ai-talk.js). Gõ AITalk.status() trong Console để xem tình trạng key.
// Hết key / hết hạn mức / mất mạng => tự dùng kịch bản mẫu (dịch bằng trLine nếu không phải vi/en/ko).
const voices=()=>{loadVoices();const l=getLang(),pri=(TTSL[l]||'en').split('-')[0],list=VOICES.filter(v=>normL(v.lang).startsWith(pri)).map(v=>v.name+' ['+v.lang+']');console.log('Ngôn ngữ',l,'| giọng trong máy:',list.length?list:'(KHÔNG có)','| sẽ dùng:',(pickVoice(l)||{v:{name:'(không có -> thử giọng Google)'}}).v.name);return list};
window.GuideBot={voices,cfg:CFG,getLang,stop:stopSpeech,speak:i=>window.PavilionGuide&&speakPicture(i,window.PavilionGuide),root};
})();
