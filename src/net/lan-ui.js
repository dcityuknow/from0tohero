// Màn hình chọn cách chơi (dựng riêng, nền game mờ + khối voxel trang trí), hiện SAU bước chọn ngôn ngữ / tên / nhân vật:
//   [Chơi một mình]  -> vào bảng "Bấm để chơi" như cũ
//   [Chơi team]      -> [Tạo phòng] (chủ phòng, nhận mã) hoặc [Vào phòng] (nhập mã)  ->  SẢNH CHỜ (mã phòng, danh sách người, chủ phòng bấm Bắt đầu)  -> vào trận
// Trong trận: thanh trạng thái, bảng điểm (giữ Tab), chat (Enter / T), kill feed. Điều khiển mạng thực sự nằm ở net/net.js.
// Nạp CUỐI CÙNG (sau ui/profile.js, nó gọi LanUI.afterProfile khi hồ sơ xong). Chữ: đủ 11 ngôn ngữ như i18n.js (vi en ru uk ng bn id hi zh fil ko); khóa nào thiếu tự dùng tiếng Anh - thêm bản dịch ở NT.
window.LanUI=(function(){
  const NT={
    vi:{btn:'Phòng',hello:'Xin chào, {0}!',ask:'Bạn muốn chơi thế nào?',soloT:'Chơi một mình',soloD:'Leo 4 tầng, hạ từng con boss bằng sức của chính bạn.',soloB:'▶ Chơi solo',
      teamT:'Chơi cùng bạn bè',teamD:'Tạo phòng, gửi mã cho bạn bè rồi cùng vào trận.',teamB:'Chơi team',back:'← Quay lại',
      createT:'Tạo phòng',createD:'Bạn là chủ phòng: nhận mã phòng để mời bạn bè, bạn bấm Bắt đầu khi đủ người.',createB:'🏠 Tạo phòng',
      joinT:'Vào phòng',joinD:'Nhập mã phòng 5 ký tự mà chủ phòng gửi cho bạn.',joinB:'Vào phòng',codePh:'MÃ',leave:'Rời phòng',close:'Đóng',
      connecting:'Đang kết nối…',players:'Người chơi',ping:'Ping',
      e_code:'Hãy nhập mã phòng (5 ký tự).',e_nocode:'Không tìm thấy phòng có mã này. Kiểm tra lại mã, hoặc chủ phòng đã đóng phòng.',
      e_conn:'Không kết nối được. Cần có internet, và mạng không được chặn WebRTC.',e_timeout:'Hết thời gian chờ. Hãy thử lại.',e_full:'Phòng đã đầy.',
      e_closed:'Mất kết nối với chủ phòng.',e_hostleft:'Chủ phòng đã đóng phòng.',
      lobby:'Sảnh chờ',inGame:'Đang trong trận',roomCode:'MÃ PHÒNG',copy:'Sao chép mã',copyLink:'Sao chép link mời',copied:'Đã sao chép',
      shareH:'Gửi mã hoặc link mời cho bạn bè. Họ mở game, chọn "Chơi team" rồi nhập mã.',
      start:'▶ Bắt đầu',waitHost:'Đang chờ chủ phòng bắt đầu…',waitPlayers:'Bạn là chủ phòng. Bấm Bắt đầu khi mọi người đã vào đủ.',
      youHost:'Cài đặt phòng',pvp:'⚔️ PvP (bắn trúng nhau gây sát thương)',bots:'🤖 Bot / quái (chủ phòng chạy, cả phòng thấy giống nhau)',
      note:'Lưu ý: bot và boss do chủ phòng chạy (đồng bộ cho cả phòng). Vật phẩm rơi chạy riêng từng máy; lính cung tạm tắt khi chơi trong phòng.',hostTag:'Chủ phòng',you:'Bạn',
      kills:'Hạ',deaths:'Chết',name:'Tên',sbH:'Bảng điểm',chatPh:'Nhắn tin… (Enter để gửi, Esc để huỷ)',
      joined:'{0} vào phòng',left:'{0} rời phòng',died:'{0} ☠',lost:'Mất kết nối',hint:'Enter: chat · Tab: bảng điểm',
      go:'▶ Vào trận',startedSub:'Chủ phòng đã bắt đầu! Bấm để vào trận.',needStart:'Chờ chủ phòng bấm Bắt đầu.',slotWait:'Đang chờ bạn bè…',
      modeH:'Chế độ chơi',time:'⏱ Mỗi trận 5 phút',locked:'🔒 Chế độ bị khóa tới khi hết giờ.',onlyHost:'Chỉ chủ phòng đổi được chế độ.',
      m_ffa:'⚔️ PvP hỗn chiến',d_ffa:'Ai cũng bắn được nhau. Hạ 1 người = 1 điểm.',
      m_team:'🛡️ PvP theo phe',d_team:'Chia 2 phe, chọn phe ở sảnh chờ. Điểm xếp hạng tính theo phe. Cùng phe không bắn trúng nhau.',
      m_ffabot:'⚔️🤖 PvP hỗn chiến + bot',d_ffabot:'Ai cũng bắn được nhau, thêm bot tấn công tất cả mọi người.',
      m_teambot:'🛡️🤖 PvP theo phe + bot',d_teambot:'Chia 2 phe, thêm bot tấn công cả hai phe.',
      m_peace:'🕊️ Hòa bình',d_peace:'Chỉ tham quan: đi lên tầng 2, 3 tùy thích, không cần hạ boss. Bot vẫn xuất hiện và nói chuyện nhưng không tấn công.',
      teamH:'Chọn team của bạn',t0:'🔴 Optimum Mascot',t1:'🔵 Optimum Ghost',endT:'Hết giờ!',winT:'{0} thắng!',draw:'Hòa!',pts:'Điểm',peaceEnd:'Hết giờ tham quan. Cảm ơn bạn đã ghé thăm!',again:'Chủ phòng có thể đổi chế độ rồi bấm Bắt đầu để chơi tiếp.'},
    en:{btn:'Room',hello:'Hello, {0}!',ask:'How do you want to play?',soloT:'Play solo',soloD:'Climb 4 floors and beat every boss on your own.',soloB:'▶ Play solo',
      teamT:'Play with friends',teamD:'Create a room, send the code to your friends and enter the match together.',teamB:'Play team',back:'← Back',
      createT:'Create a room',createD:'You are the host: get a room code to invite friends, press Start when everyone is in.',createB:'🏠 Create room',
      joinT:'Join a room',joinD:'Enter the 5-character room code the host sent you.',joinB:'Join room',codePh:'CODE',leave:'Leave room',close:'Close',
      connecting:'Connecting…',players:'Players',ping:'Ping',
      e_code:'Enter the room code (5 characters).',e_nocode:'No room with this code. Check the code, or the host has closed the room.',
      e_conn:'Could not connect. You need internet access and a network that allows WebRTC.',e_timeout:'Timed out. Please try again.',e_full:'The room is full.',
      e_closed:'Lost connection to the host.',e_hostleft:'The host closed the room.',
      lobby:'Lobby',inGame:'Match in progress',roomCode:'ROOM CODE',copy:'Copy code',copyLink:'Copy invite link',copied:'Copied',
      shareH:'Send the code or the invite link to your friends. They open the game, choose "Play team" and enter the code.',
      start:'▶ Start',waitHost:'Waiting for the host to start…',waitPlayers:'You are the host. Press Start when everyone has joined.',
      youHost:'Room settings',pvp:'⚔️ PvP (players damage each other)',bots:'🤖 Bots / monsters (host runs them, everyone sees the same)',
      note:'Note: bots and bosses are run by the host and synced to the room. Dropped items run separately on each PC; archers are disabled in rooms for now.',hostTag:'Host',you:'You',
      kills:'Kills',deaths:'Deaths',name:'Name',sbH:'Scoreboard',chatPh:'Type a message… (Enter to send, Esc to cancel)',
      joined:'{0} joined',left:'{0} left',died:'{0} ☠',lost:'Disconnected',hint:'Enter: chat · Tab: scoreboard',
      go:'▶ Enter match',startedSub:'The host started the match! Click to enter.',needStart:'Waiting for the host to press Start.',slotWait:'Waiting for friends…',
      modeH:'Game mode',time:'⏱ 5 minutes per match',locked:'🔒 Mode is locked until time is up.',onlyHost:'Only the host can change the mode.',
      m_ffa:'⚔️ Free-for-all PvP',d_ffa:'Everyone can shoot everyone. 1 kill = 1 point.',
      m_team:'🛡️ Team PvP',d_team:'Two sides, pick yours in the lobby. Ranking is per team. Teammates cannot hurt each other.',
      m_ffabot:'⚔️🤖 Free-for-all PvP + bots',d_ffabot:'Everyone can shoot everyone, plus bots attacking all players.',
      m_teambot:'🛡️🤖 Team PvP + bots',d_teambot:'Two sides, plus bots attacking both teams.',
      m_peace:'🕊️ Peace',d_peace:'Sightseeing only: go up to floors 2, 3... freely, no boss to beat. Bots appear and talk as usual but never attack.',
      teamH:'Pick your team',t0:'🔴 Optimum Mascot',t1:'🔵 Optimum Ghost',endT:'Time is up!',winT:'{0} wins!',draw:'Draw!',pts:'Points',peaceEnd:'Sightseeing time is over. Thanks for visiting!',again:'The host can change the mode and press Start to play again.'},
    ru:{btn:'Комната',hello:'Привет, {0}!',ask:'Как хотите играть?',soloT:'Играть одному',soloD:'Поднимитесь на 4 этажа и победите каждого босса в одиночку.',soloB:'▶ Играть соло',
      teamT:'Играть с друзьями',teamD:'Создайте комнату, отправьте код друзьям и вместе войдите в матч.',teamB:'Командная игра',back:'← Назад',
      createT:'Создать комнату',createD:'Вы хост: получите код комнаты, чтобы пригласить друзей, и нажмите «Старт», когда все соберутся.',createB:'🏠 Создать комнату',
      joinT:'Войти в комнату',joinD:'Введите 5-символьный код комнаты, который прислал хост.',joinB:'Войти',codePh:'КОД',leave:'Покинуть комнату',close:'Закрыть',
      connecting:'Подключение…',players:'Игроки',ping:'Пинг',
      e_code:'Введите код комнаты (5 символов).',e_nocode:'Комната с таким кодом не найдена. Проверьте код: возможно, хост закрыл комнату.',
      e_conn:'Не удалось подключиться. Нужен интернет, а сеть не должна блокировать WebRTC.',e_timeout:'Время ожидания истекло. Попробуйте ещё раз.',e_full:'Комната заполнена.',
      e_closed:'Потеряно соединение с хостом.',e_hostleft:'Хост закрыл комнату.',
      lobby:'Лобби',inGame:'Матч идёт',roomCode:'КОД КОМНАТЫ',copy:'Копировать код',copyLink:'Копировать ссылку',copied:'Скопировано',
      shareH:'Отправьте код или ссылку друзьям. Они открывают игру, выбирают «Командная игра» и вводят код.',
      start:'▶ Старт',waitHost:'Ждём, когда хост начнёт…',waitPlayers:'Вы хост. Нажмите «Старт», когда все зайдут.',
      youHost:'Настройки комнаты',pvp:'⚔️ PvP (игроки наносят урон друг другу)',bots:'🤖 Боты / монстры (запускает хост, все видят одно и то же)',
      note:'Примечание: боты и боссы работают на стороне хоста и синхронизируются с комнатой. Выпадающие предметы считаются отдельно на каждом ПК; лучники в комнатах пока отключены.',hostTag:'Хост',you:'Вы',
      kills:'Убийства',deaths:'Смерти',name:'Имя',sbH:'Таблица очков',chatPh:'Сообщение… (Enter — отправить, Esc — отмена)',
      joined:'{0} вошёл в комнату',left:'{0} вышел из комнаты',died:'{0} ☠',lost:'Соединение потеряно',hint:'Enter: чат · Tab: таблица очков',
      go:'▶ В матч',startedSub:'Хост начал матч! Нажмите, чтобы войти.',needStart:'Ждём, пока хост нажмёт «Старт».',slotWait:'Ждём друзей…',
      modeH:'Режим игры',time:'⏱ 5 минут на матч',locked:'🔒 Режим заблокирован до конца времени.',onlyHost:'Менять режим может только хост.',
      m_ffa:'⚔️ PvP все против всех',d_ffa:'Все могут стрелять во всех. 1 убийство = 1 очко.',
      m_team:'🛡️ Командный PvP',d_team:'Две команды, выберите свою в лобби. Рейтинг по командам. Союзники не наносят друг другу урон.',
      m_ffabot:'⚔️🤖 PvP все против всех + боты',d_ffabot:'Все стреляют во всех, плюс боты атакуют всех игроков.',
      m_teambot:'🛡️🤖 Командный PvP + боты',d_teambot:'Две команды, плюс боты атакуют обе команды.',
      m_peace:'🕊️ Мир',d_peace:'Только прогулка: свободно поднимайтесь на 2-й, 3-й этаж, боссов побеждать не нужно. Боты появляются и разговаривают, но не атакуют.',
      teamH:'Выберите команду',t0:'🔴 Optimum Mascot',t1:'🔵 Optimum Ghost',endT:'Время вышло!',winT:'Победа: {0}!',draw:'Ничья!',pts:'Очки',peaceEnd:'Время прогулки закончилось. Спасибо за визит!',again:'Хост может сменить режим и нажать «Старт», чтобы сыграть снова.'},
    uk:{btn:'Кімната',hello:'Привіт, {0}!',ask:'Як хочете грати?',soloT:'Грати наодинці',soloD:'Піднімися на 4 поверхи й переможи кожного боса самостійно.',soloB:'▶ Грати соло',
      teamT:'Грати з друзями',teamD:'Створіть кімнату, надішліть код друзям і разом увійдіть у матч.',teamB:'Командна гра',back:'← Назад',
      createT:'Створити кімнату',createD:'Ви хост: отримайте код кімнати, щоб запросити друзів, і натисніть «Старт», коли всі зберуться.',createB:'🏠 Створити кімнату',
      joinT:'Увійти в кімнату',joinD:'Введіть 5-символьний код кімнати, який надіслав хост.',joinB:'Увійти',codePh:'КОД',leave:'Вийти з кімнати',close:'Закрити',
      connecting:'Підключення…',players:'Гравці',ping:'Пінг',
      e_code:'Введіть код кімнати (5 символів).',e_nocode:'Кімнату з таким кодом не знайдено. Перевірте код: можливо, хост закрив кімнату.',
      e_conn:'Не вдалося підключитися. Потрібен інтернет, а мережа не повинна блокувати WebRTC.',e_timeout:'Час очікування вичерпано. Спробуйте ще раз.',e_full:'Кімната заповнена.',
      e_closed:'Втрачено з’єднання з хостом.',e_hostleft:'Хост закрив кімнату.',
      lobby:'Лобі',inGame:'Матч триває',roomCode:'КОД КІМНАТИ',copy:'Копіювати код',copyLink:'Копіювати посилання',copied:'Скопійовано',
      shareH:'Надішліть код або посилання друзям. Вони відкривають гру, обирають «Командна гра» й вводять код.',
      start:'▶ Старт',waitHost:'Чекаємо, поки хост почне…',waitPlayers:'Ви хост. Натисніть «Старт», коли всі зайдуть.',
      youHost:'Налаштування кімнати',pvp:'⚔️ PvP (гравці завдають шкоди одне одному)',bots:'🤖 Боти / монстри (запускає хост, усі бачать однакове)',
      note:'Примітка: боти й боси працюють на боці хоста та синхронізуються з кімнатою. Предмети, що випадають, рахуються окремо на кожному ПК; лучники в кімнатах поки вимкнені.',hostTag:'Хост',you:'Ви',
      kills:'Вбивства',deaths:'Смерті',name:'Ім’я',sbH:'Таблиця очок',chatPh:'Повідомлення… (Enter — надіслати, Esc — скасувати)',
      joined:'{0} увійшов у кімнату',left:'{0} вийшов із кімнати',died:'{0} ☠',lost:'З’єднання втрачено',hint:'Enter: чат · Tab: таблиця очок',
      go:'▶ У матч',startedSub:'Хост розпочав матч! Натисніть, щоб увійти.',needStart:'Чекаємо, поки хост натисне «Старт».',slotWait:'Чекаємо друзів…',
      modeH:'Режим гри',time:'⏱ 5 хвилин на матч',locked:'🔒 Режим заблоковано до кінця часу.',onlyHost:'Змінювати режим може лише хост.',
      m_ffa:'⚔️ PvP кожен сам за себе',d_ffa:'Усі можуть стріляти в усіх. 1 вбивство = 1 очко.',
      m_team:'🛡️ Командний PvP',d_team:'Дві команди, оберіть свою в лобі. Рейтинг за командами. Союзники не завдають шкоди одне одному.',
      m_ffabot:'⚔️🤖 PvP кожен сам за себе + боти',d_ffabot:'Усі стріляють в усіх, а боти атакують усіх гравців.',
      m_teambot:'🛡️🤖 Командний PvP + боти',d_teambot:'Дві команди, а боти атакують обидві.',
      m_peace:'🕊️ Мир',d_peace:'Лише прогулянка: вільно підіймайтеся на 2-й, 3-й поверх, босів перемагати не треба. Боти з’являються й розмовляють, але не атакують.',
      teamH:'Оберіть команду',t0:'🔴 Optimum Mascot',t1:'🔵 Optimum Ghost',endT:'Час вичерпано!',winT:'Перемога: {0}!',draw:'Нічия!',pts:'Очки',peaceEnd:'Час прогулянки закінчився. Дякуємо за візит!',again:'Хост може змінити режим і натиснути «Старт», щоб зіграти знову.'},
    ng:{btn:'Room',hello:'How far, {0}!',ask:'How you wan play?',soloT:'Play alone',soloD:'Climb 4 floors, beat every boss with your own power.',soloB:'▶ Play solo',
      teamT:'Play with your padi dem',teamD:'Create room, send the code give your padi dem make una enter match together.',teamB:'Play team',back:'← Go back',
      createT:'Create room',createD:'You be the host: collect room code to invite your padi dem, press Start when everybody don enter.',createB:'🏠 Create room',
      joinT:'Enter room',joinD:'Put the 5-character room code wey the host send you.',joinB:'Enter room',codePh:'CODE',leave:'Comot for room',close:'Close',
      connecting:'E dey connect…',players:'Players',ping:'Ping',
      e_code:'Put the room code (5 characters).',e_nocode:'We no see room with this code. Check the code well, or the host don close the room.',
      e_conn:'E no connect. You need internet, and the network must no block WebRTC.',e_timeout:'Time don finish. Try again abeg.',e_full:'The room don full.',
      e_closed:'You don lose connection with the host.',e_hostleft:'The host don close the room.',
      lobby:'Lobby',inGame:'Match dey go on',roomCode:'ROOM CODE',copy:'Copy code',copyLink:'Copy invite link',copied:'Don copy',
      shareH:'Send the code or invite link give your padi dem. Dem go open the game, choose “Play team” and put the code.',
      start:'▶ Start',waitHost:'We dey wait make host start…',waitPlayers:'You be the host. Press Start when everybody don enter.',
      youHost:'Room settings',pvp:'⚔️ PvP (players fit damage each other)',bots:'🤖 Bots / monsters (host dey run dem, everybody go see the same thing)',
      note:'Note: host dey run bots and bosses and dem dey sync to the room. Items wey drop dey run separate for each PC; archers no dey work for rooms for now.',hostTag:'Host',you:'You',
      kills:'Kills',deaths:'Deaths',name:'Name',sbH:'Scoreboard',chatPh:'Type message… (Enter to send, Esc to cancel)',
      joined:'{0} enter the room',left:'{0} comot for room',died:'{0} ☠',lost:'Connection don cut',hint:'Enter: chat · Tab: scoreboard',
      go:'▶ Enter match',startedSub:'The host don start the match! Click to enter.',needStart:'Wait make the host press Start.',slotWait:'We dey wait for your padi dem…',
      modeH:'Game mode',time:'⏱ 5 minutes for each match',locked:'🔒 Mode don lock until time finish.',onlyHost:'Na only the host fit change the mode.',
      m_ffa:'⚔️ Free-for-all PvP',d_ffa:'Everybody fit shoot everybody. 1 kill = 1 point.',
      m_team:'🛡️ Team PvP',d_team:'Two sides, pick your own for the lobby. Ranking na per team. Teammates no fit hurt each other.',
      m_ffabot:'⚔️🤖 Free-for-all PvP + bots',d_ffabot:'Everybody fit shoot everybody, plus bots wey dey attack all players.',
      m_teambot:'🛡️🤖 Team PvP + bots',d_teambot:'Two sides, plus bots wey dey attack both teams.',
      m_peace:'🕊️ Peace',d_peace:'Na only to waka around: climb go floor 2, 3 as you like, no boss to beat. Bots go show and dey talk but dem no go attack.',
      teamH:'Pick your team',t0:'🔴 Optimum Mascot',t1:'🔵 Optimum Ghost',endT:'Time don finish!',winT:'{0} don win!',draw:'Draw!',pts:'Points',peaceEnd:'Waka-around time don finish. Thank you for visiting!',again:'The host fit change the mode and press Start make una play again.'},
    bn:{btn:'রুম',hello:'হ্যালো, {0}!',ask:'আপনি কীভাবে খেলতে চান?',soloT:'একা খেলুন',soloD:'৪টি তলা উঠুন এবং নিজের ক্ষমতায় প্রতিটি বসকে হারান।',soloB:'▶ সোলো খেলুন',
      teamT:'বন্ধুদের সাথে খেলুন',teamD:'রুম তৈরি করুন, বন্ধুদের কোড পাঠান এবং একসাথে ম্যাচে ঢুকুন।',teamB:'টিম খেলা',back:'← ফিরে যান',
      createT:'রুম তৈরি করুন',createD:'আপনি হোস্ট: বন্ধুদের আমন্ত্রণ জানাতে রুম কোড নিন, সবাই এলে স্টার্ট চাপুন।',createB:'🏠 রুম তৈরি করুন',
      joinT:'রুমে ঢুকুন',joinD:'হোস্টের পাঠানো ৫ অক্ষরের রুম কোড লিখুন।',joinB:'রুমে ঢুকুন',codePh:'কোড',leave:'রুম ছাড়ুন',close:'বন্ধ করুন',
      connecting:'সংযোগ হচ্ছে…',players:'খেলোয়াড়',ping:'পিং',
      e_code:'রুম কোড লিখুন (৫ অক্ষর)।',e_nocode:'এই কোডের কোনো রুম পাওয়া যায়নি। কোডটি আবার দেখুন, অথবা হোস্ট রুম বন্ধ করে দিয়েছে।',
      e_conn:'সংযোগ করা যায়নি। ইন্টারনেট দরকার এবং নেটওয়ার্ক যেন WebRTC আটকে না দেয়।',e_timeout:'সময় শেষ। আবার চেষ্টা করুন।',e_full:'রুম পূর্ণ।',
      e_closed:'হোস্টের সাথে সংযোগ হারিয়ে গেছে।',e_hostleft:'হোস্ট রুম বন্ধ করে দিয়েছে।',
      lobby:'লবি',inGame:'ম্যাচ চলছে',roomCode:'রুম কোড',copy:'কোড কপি করুন',copyLink:'আমন্ত্রণ লিংক কপি করুন',copied:'কপি হয়েছে',
      shareH:'বন্ধুদের কোড বা আমন্ত্রণ লিংক পাঠান। তারা গেম খুলে “টিম খেলা” বেছে কোড লিখবে।',
      start:'▶ স্টার্ট',waitHost:'হোস্টের শুরু করার অপেক্ষায়…',waitPlayers:'আপনি হোস্ট। সবাই ঢুকলে স্টার্ট চাপুন।',
      youHost:'রুম সেটিংস',pvp:'⚔️ PvP (খেলোয়াড়রা একে অপরকে ক্ষতি করতে পারে)',bots:'🤖 বট / দানব (হোস্ট চালায়, সবাই একই জিনিস দেখে)',
      note:'দ্রষ্টব্য: বট ও বস হোস্ট চালায় এবং রুমে সিঙ্ক হয়। ড্রপ হওয়া আইটেম প্রতিটি পিসিতে আলাদা চলে; রুমে আপাতত তীরন্দাজ বন্ধ।',hostTag:'হোস্ট',you:'আপনি',
      kills:'কিল',deaths:'মৃত্যু',name:'নাম',sbH:'স্কোরবোর্ড',chatPh:'বার্তা লিখুন… (পাঠাতে Enter, বাতিলে Esc)',
      joined:'{0} রুমে ঢুকেছে',left:'{0} রুম ছেড়েছে',died:'{0} ☠',lost:'সংযোগ বিচ্ছিন্ন',hint:'Enter: চ্যাট · Tab: স্কোরবোর্ড',
      go:'▶ ম্যাচে ঢুকুন',startedSub:'হোস্ট ম্যাচ শুরু করেছে! ঢুকতে ক্লিক করুন।',needStart:'হোস্ট স্টার্ট চাপা পর্যন্ত অপেক্ষা করুন।',slotWait:'বন্ধুদের অপেক্ষায়…',
      modeH:'গেম মোড',time:'⏱ প্রতি ম্যাচ ৫ মিনিট',locked:'🔒 সময় শেষ না হওয়া পর্যন্ত মোড লক করা।',onlyHost:'শুধু হোস্ট মোড বদলাতে পারে।',
      m_ffa:'⚔️ সবাই সবার বিপক্ষে PvP',d_ffa:'সবাই সবাইকে গুলি করতে পারে। ১ কিল = ১ পয়েন্ট।',
      m_team:'🛡️ টিম PvP',d_team:'দুই পক্ষ, লবিতে নিজের পক্ষ বেছে নিন। র‍্যাংকিং টিম অনুযায়ী। একই টিমের সদস্যরা একে অপরকে আঘাত করতে পারে না।',
      m_ffabot:'⚔️🤖 সবাই সবার বিপক্ষে PvP + বট',d_ffabot:'সবাই সবাইকে গুলি করতে পারে, সাথে বট সব খেলোয়াড়কে আক্রমণ করে।',
      m_teambot:'🛡️🤖 টিম PvP + বট',d_teambot:'দুই পক্ষ, সাথে বট দুই টিমকেই আক্রমণ করে।',
      m_peace:'🕊️ শান্তি',d_peace:'শুধু ঘুরে দেখা: ২য়, ৩য় তলায় স্বাধীনভাবে উঠুন, বস হারানোর দরকার নেই। বট দেখা দেয় ও কথা বলে কিন্তু আক্রমণ করে না।',
      teamH:'আপনার টিম বেছে নিন',t0:'🔴 Optimum Mascot',t1:'🔵 Optimum Ghost',endT:'সময় শেষ!',winT:'{0} জিতেছে!',draw:'ড্র!',pts:'পয়েন্ট',peaceEnd:'ঘুরে দেখার সময় শেষ। আসার জন্য ধন্যবাদ!',again:'হোস্ট মোড বদলে স্টার্ট চেপে আবার খেলতে পারে।'},
    id:{btn:'Ruang',hello:'Halo, {0}!',ask:'Bagaimana kamu ingin bermain?',soloT:'Main sendiri',soloD:'Naiki 4 lantai dan kalahkan setiap boss dengan kekuatanmu sendiri.',soloB:'▶ Main solo',
      teamT:'Main bersama teman',teamD:'Buat ruang, kirim kodenya ke teman, lalu masuk pertandingan bersama.',teamB:'Main tim',back:'← Kembali',
      createT:'Buat ruang',createD:'Kamu adalah host: dapatkan kode ruang untuk mengundang teman, tekan Mulai saat semua sudah masuk.',createB:'🏠 Buat ruang',
      joinT:'Masuk ruang',joinD:'Masukkan kode ruang 5 karakter yang dikirim host.',joinB:'Masuk ruang',codePh:'KODE',leave:'Keluar ruang',close:'Tutup',
      connecting:'Menghubungkan…',players:'Pemain',ping:'Ping',
      e_code:'Masukkan kode ruang (5 karakter).',e_nocode:'Ruang dengan kode ini tidak ditemukan. Periksa kodenya, atau host sudah menutup ruang.',
      e_conn:'Tidak dapat terhubung. Perlu internet, dan jaringan tidak boleh memblokir WebRTC.',e_timeout:'Waktu habis. Silakan coba lagi.',e_full:'Ruang sudah penuh.',
      e_closed:'Koneksi ke host terputus.',e_hostleft:'Host menutup ruang.',
      lobby:'Lobi',inGame:'Pertandingan berlangsung',roomCode:'KODE RUANG',copy:'Salin kode',copyLink:'Salin tautan undangan',copied:'Tersalin',
      shareH:'Kirim kode atau tautan undangan ke teman. Mereka membuka game, memilih “Main tim”, lalu memasukkan kode.',
      start:'▶ Mulai',waitHost:'Menunggu host memulai…',waitPlayers:'Kamu adalah host. Tekan Mulai saat semua sudah masuk.',
      youHost:'Pengaturan ruang',pvp:'⚔️ PvP (pemain saling melukai)',bots:'🤖 Bot / monster (dijalankan host, semua melihat hal yang sama)',
      note:'Catatan: bot dan boss dijalankan oleh host dan disinkronkan ke ruang. Item yang jatuh berjalan terpisah di tiap PC; pemanah dinonaktifkan sementara di ruang.',hostTag:'Host',you:'Kamu',
      kills:'Kill',deaths:'Mati',name:'Nama',sbH:'Papan skor',chatPh:'Ketik pesan… (Enter untuk kirim, Esc untuk batal)',
      joined:'{0} masuk ruang',left:'{0} keluar ruang',died:'{0} ☠',lost:'Koneksi terputus',hint:'Enter: chat · Tab: papan skor',
      go:'▶ Masuk pertandingan',startedSub:'Host memulai pertandingan! Klik untuk masuk.',needStart:'Menunggu host menekan Mulai.',slotWait:'Menunggu teman…',
      modeH:'Mode permainan',time:'⏱ 5 menit per pertandingan',locked:'🔒 Mode dikunci sampai waktu habis.',onlyHost:'Hanya host yang bisa mengubah mode.',
      m_ffa:'⚔️ PvP bebas semua',d_ffa:'Semua bisa menembak semua. 1 kill = 1 poin.',
      m_team:'🛡️ PvP tim',d_team:'Dua pihak, pilih pihakmu di lobi. Peringkat per tim. Rekan satu tim tidak bisa saling melukai.',
      m_ffabot:'⚔️🤖 PvP bebas semua + bot',d_ffabot:'Semua bisa menembak semua, ditambah bot yang menyerang semua pemain.',
      m_teambot:'🛡️🤖 PvP tim + bot',d_teambot:'Dua pihak, ditambah bot yang menyerang kedua tim.',
      m_peace:'🕊️ Damai',d_peace:'Hanya jalan-jalan: naik ke lantai 2, 3 dengan bebas, tidak perlu mengalahkan boss. Bot tetap muncul dan berbicara tetapi tidak menyerang.',
      teamH:'Pilih timmu',t0:'🔴 Optimum Mascot',t1:'🔵 Optimum Ghost',endT:'Waktu habis!',winT:'{0} menang!',draw:'Seri!',pts:'Poin',peaceEnd:'Waktu jalan-jalan selesai. Terima kasih sudah berkunjung!',again:'Host bisa mengubah mode lalu menekan Mulai untuk bermain lagi.'},
    hi:{btn:'रूम',hello:'नमस्ते, {0}!',ask:'आप कैसे खेलना चाहते हैं?',soloT:'अकेले खेलें',soloD:'4 मंज़िलें चढ़ें और अपने दम पर हर बॉस को हराएँ।',soloB:'▶ सोलो खेलें',
      teamT:'दोस्तों के साथ खेलें',teamD:'रूम बनाएँ, दोस्तों को कोड भेजें और साथ में मैच में उतरें।',teamB:'टीम गेम',back:'← वापस',
      createT:'रूम बनाएँ',createD:'आप होस्ट हैं: दोस्तों को बुलाने के लिए रूम कोड लें, सब आ जाएँ तो स्टार्ट दबाएँ।',createB:'🏠 रूम बनाएँ',
      joinT:'रूम में जाएँ',joinD:'होस्ट द्वारा भेजा गया 5 अक्षरों का रूम कोड डालें।',joinB:'रूम में जाएँ',codePh:'कोड',leave:'रूम छोड़ें',close:'बंद करें',
      connecting:'कनेक्ट हो रहा है…',players:'खिलाड़ी',ping:'पिंग',
      e_code:'रूम कोड डालें (5 अक्षर)।',e_nocode:'इस कोड वाला कोई रूम नहीं मिला। कोड जाँचें, या होस्ट ने रूम बंद कर दिया है।',
      e_conn:'कनेक्ट नहीं हो सका। इंटरनेट चाहिए और नेटवर्क WebRTC को ब्लॉक न करे।',e_timeout:'समय समाप्त। कृपया फिर कोशिश करें।',e_full:'रूम भरा हुआ है।',
      e_closed:'होस्ट से कनेक्शन टूट गया।',e_hostleft:'होस्ट ने रूम बंद कर दिया।',
      lobby:'लॉबी',inGame:'मैच जारी है',roomCode:'रूम कोड',copy:'कोड कॉपी करें',copyLink:'इनवाइट लिंक कॉपी करें',copied:'कॉपी हो गया',
      shareH:'दोस्तों को कोड या इनवाइट लिंक भेजें। वे गेम खोलकर “टीम गेम” चुनें और कोड डालें।',
      start:'▶ स्टार्ट',waitHost:'होस्ट के शुरू करने का इंतज़ार…',waitPlayers:'आप होस्ट हैं। सबके आ जाने पर स्टार्ट दबाएँ।',
      youHost:'रूम सेटिंग्स',pvp:'⚔️ PvP (खिलाड़ी एक-दूसरे को नुकसान पहुँचा सकते हैं)',bots:'🤖 बॉट / राक्षस (होस्ट चलाता है, सबको एक जैसा दिखता है)',
      note:'नोट: बॉट और बॉस होस्ट चलाता है और रूम में सिंक होते हैं। गिरने वाले आइटम हर पीसी पर अलग चलते हैं; रूम में फ़िलहाल तीरंदाज़ बंद हैं।',hostTag:'होस्ट',you:'आप',
      kills:'किल',deaths:'मौत',name:'नाम',sbH:'स्कोरबोर्ड',chatPh:'संदेश लिखें… (भेजने को Enter, रद्द करने को Esc)',
      joined:'{0} रूम में आया',left:'{0} ने रूम छोड़ा',died:'{0} ☠',lost:'कनेक्शन टूट गया',hint:'Enter: चैट · Tab: स्कोरबोर्ड',
      go:'▶ मैच में जाएँ',startedSub:'होस्ट ने मैच शुरू कर दिया! अंदर जाने के लिए क्लिक करें।',needStart:'होस्ट के स्टार्ट दबाने का इंतज़ार करें।',slotWait:'दोस्तों का इंतज़ार…',
      modeH:'गेम मोड',time:'⏱ हर मैच 5 मिनट का',locked:'🔒 समय खत्म होने तक मोड लॉक है।',onlyHost:'सिर्फ़ होस्ट मोड बदल सकता है।',
      m_ffa:'⚔️ सब बनाम सब PvP',d_ffa:'हर कोई हर किसी पर गोली चला सकता है। 1 किल = 1 अंक।',
      m_team:'🛡️ टीम PvP',d_team:'दो पक्ष, लॉबी में अपना पक्ष चुनें। रैंकिंग टीम के हिसाब से। साथी खिलाड़ी एक-दूसरे को चोट नहीं पहुँचा सकते।',
      m_ffabot:'⚔️🤖 सब बनाम सब PvP + बॉट',d_ffabot:'हर कोई हर किसी पर गोली चला सकता है, साथ में बॉट सभी खिलाड़ियों पर हमला करते हैं।',
      m_teambot:'🛡️🤖 टीम PvP + बॉट',d_teambot:'दो पक्ष, साथ में बॉट दोनों टीमों पर हमला करते हैं।',
      m_peace:'🕊️ शांति',d_peace:'सिर्फ़ घूमना: दूसरी, तीसरी मंज़िल पर आराम से जाएँ, बॉस हराने की ज़रूरत नहीं। बॉट दिखते और बोलते हैं पर हमला नहीं करते।',
      teamH:'अपनी टीम चुनें',t0:'🔴 Optimum Mascot',t1:'🔵 Optimum Ghost',endT:'समय समाप्त!',winT:'{0} जीत गया!',draw:'ड्रॉ!',pts:'अंक',peaceEnd:'घूमने का समय खत्म हुआ। आने के लिए धन्यवाद!',again:'होस्ट मोड बदलकर स्टार्ट दबा सकता है और फिर से खेल सकता है।'},
    zh:{btn:'房间',hello:'你好，{0}！',ask:'你想怎么玩？',soloT:'单人游戏',soloD:'独自攀登4层楼，击败每一个Boss。',soloB:'▶ 单人游戏',
      teamT:'和朋友一起玩',teamD:'创建房间，把房间码发给朋友，一起进入比赛。',teamB:'组队游戏',back:'← 返回',
      createT:'创建房间',createD:'你是房主：获取房间码邀请朋友，人到齐后点击开始。',createB:'🏠 创建房间',
      joinT:'加入房间',joinD:'输入房主发给你的5位房间码。',joinB:'加入房间',codePh:'房间码',leave:'离开房间',close:'关闭',
      connecting:'连接中…',players:'玩家',ping:'延迟',
      e_code:'请输入房间码（5位）。',e_nocode:'找不到该房间码对应的房间。请检查房间码，或房主已关闭房间。',
      e_conn:'无法连接。需要联网，且网络不能屏蔽 WebRTC。',e_timeout:'等待超时，请重试。',e_full:'房间已满。',
      e_closed:'与房主的连接已断开。',e_hostleft:'房主已关闭房间。',
      lobby:'大厅',inGame:'比赛进行中',roomCode:'房间码',copy:'复制房间码',copyLink:'复制邀请链接',copied:'已复制',
      shareH:'把房间码或邀请链接发给朋友。他们打开游戏，选择“组队游戏”并输入房间码。',
      start:'▶ 开始',waitHost:'等待房主开始…',waitPlayers:'你是房主。人到齐后点击开始。',
      youHost:'房间设置',pvp:'⚔️ PvP（玩家互相伤害）',bots:'🤖 机器人 / 怪物（由房主运行，所有人看到相同画面）',
      note:'注意：机器人和Boss由房主运行并同步给房间。掉落物品在各台电脑上独立运行；房间内暂时禁用弓箭手。',hostTag:'房主',you:'你',
      kills:'击杀',deaths:'死亡',name:'名字',sbH:'计分板',chatPh:'输入消息…（Enter 发送，Esc 取消）',
      joined:'{0} 加入了房间',left:'{0} 离开了房间',died:'{0} ☠',lost:'连接已断开',hint:'Enter：聊天 · Tab：计分板',
      go:'▶ 进入比赛',startedSub:'房主已开始比赛！点击进入。',needStart:'请等待房主点击开始。',slotWait:'等待朋友加入…',
      modeH:'游戏模式',time:'⏱ 每场比赛5分钟',locked:'🔒 时间结束前模式已锁定。',onlyHost:'只有房主可以更改模式。',
      m_ffa:'⚔️ PvP 混战',d_ffa:'所有人都可以互相射击。击杀1人=1分。',
      m_team:'🛡️ 阵营 PvP',d_team:'分成两个阵营，在大厅选择你的阵营。按阵营排名。队友之间不会互相伤害。',
      m_ffabot:'⚔️🤖 PvP 混战 + 机器人',d_ffabot:'所有人互相射击，另有机器人攻击所有玩家。',
      m_teambot:'🛡️🤖 阵营 PvP + 机器人',d_teambot:'分成两个阵营，另有机器人攻击双方。',
      m_peace:'🕊️ 和平',d_peace:'仅供参观：可自由前往2层、3层，无需击败Boss。机器人仍会出现并说话，但不会攻击。',
      teamH:'选择你的阵营',t0:'🔴 Optimum Mascot',t1:'🔵 Optimum Ghost',endT:'时间到！',winT:'{0} 获胜！',draw:'平局！',pts:'分数',peaceEnd:'参观时间结束。感谢你的到来！',again:'房主可以更改模式并点击开始再玩一局。'},
    fil:{btn:'Room',hello:'Kumusta, {0}!',ask:'Paano mo gustong maglaro?',soloT:'Maglaro mag-isa',soloD:'Akyatin ang 4 na palapag at talunin ang bawat boss gamit ang sarili mong lakas.',soloB:'▶ Solo',
      teamT:'Maglaro kasama ang mga kaibigan',teamD:'Gumawa ng room, ipadala ang code sa mga kaibigan at sabay-sabay pumasok sa laban.',teamB:'Team play',back:'← Bumalik',
      createT:'Gumawa ng room',createD:'Ikaw ang host: kunin ang room code para imbitahan ang mga kaibigan, pindutin ang Start kapag kumpleto na.',createB:'🏠 Gumawa ng room',
      joinT:'Sumali sa room',joinD:'Ilagay ang 5-character na room code na ipinadala ng host.',joinB:'Sumali',codePh:'CODE',leave:'Umalis sa room',close:'Isara',
      connecting:'Kumokonekta…',players:'Mga manlalaro',ping:'Ping',
      e_code:'Ilagay ang room code (5 character).',e_nocode:'Walang room na may ganitong code. Suriin ang code, o isinara na ng host ang room.',
      e_conn:'Hindi makakonekta. Kailangan ng internet, at hindi dapat naka-block ang WebRTC sa network.',e_timeout:'Naubos ang oras. Subukan ulit.',e_full:'Puno na ang room.',
      e_closed:'Nawala ang koneksyon sa host.',e_hostleft:'Isinara ng host ang room.',
      lobby:'Lobby',inGame:'Tuloy ang laban',roomCode:'ROOM CODE',copy:'Kopyahin ang code',copyLink:'Kopyahin ang invite link',copied:'Nakopya na',
      shareH:'Ipadala ang code o invite link sa mga kaibigan. Bubuksan nila ang laro, pipiliin ang “Team play” at ilalagay ang code.',
      start:'▶ Start',waitHost:'Hinihintay ang host na magsimula…',waitPlayers:'Ikaw ang host. Pindutin ang Start kapag nakapasok na ang lahat.',
      youHost:'Mga setting ng room',pvp:'⚔️ PvP (nagkakasakitan ang mga manlalaro)',bots:'🤖 Bot / halimaw (pinapatakbo ng host, pareho ang nakikita ng lahat)',
      note:'Paalala: ang mga bot at boss ay pinapatakbo ng host at naka-sync sa room. Ang mga nahuhulog na item ay hiwa-hiwalay sa bawat PC; naka-disable muna ang mga archer sa mga room.',hostTag:'Host',you:'Ikaw',
      kills:'Kill',deaths:'Patay',name:'Pangalan',sbH:'Scoreboard',chatPh:'Mag-type ng mensahe… (Enter para ipadala, Esc para kanselahin)',
      joined:'Pumasok si {0} sa room',left:'Umalis si {0} sa room',died:'{0} ☠',lost:'Nawala ang koneksyon',hint:'Enter: chat · Tab: scoreboard',
      go:'▶ Pumasok sa laban',startedSub:'Sinimulan na ng host ang laban! I-click para pumasok.',needStart:'Hintayin munang pindutin ng host ang Start.',slotWait:'Naghihintay ng mga kaibigan…',
      modeH:'Mode ng laro',time:'⏱ 5 minuto bawat laban',locked:'🔒 Naka-lock ang mode hanggang matapos ang oras.',onlyHost:'Ang host lang ang puwedeng magpalit ng mode.',
      m_ffa:'⚔️ Free-for-all PvP',d_ffa:'Puwedeng barilin ng lahat ang lahat. 1 kill = 1 puntos.',
      m_team:'🛡️ Team PvP',d_team:'Dalawang panig, pumili ng panig mo sa lobby. Ang ranking ay bawat team. Hindi nagkakasakitan ang magka-team.',
      m_ffabot:'⚔️🤖 Free-for-all PvP + bot',d_ffabot:'Puwedeng barilin ng lahat ang lahat, at inaatake ng mga bot ang lahat ng manlalaro.',
      m_teambot:'🛡️🤖 Team PvP + bot',d_teambot:'Dalawang panig, at inaatake ng mga bot ang dalawang team.',
      m_peace:'🕊️ Payapa',d_peace:'Pasyal lang: malayang umakyat sa palapag 2, 3, hindi na kailangang talunin ang boss. Lumalabas at nagsasalita ang mga bot pero hindi sila umaatake.',
      teamH:'Piliin ang team mo',t0:'🔴 Optimum Mascot',t1:'🔵 Optimum Ghost',endT:'Tapos na ang oras!',winT:'Panalo ang {0}!',draw:'Tabla!',pts:'Puntos',peaceEnd:'Tapos na ang oras ng pasyal. Salamat sa pagbisita!',again:'Puwedeng palitan ng host ang mode at pindutin ang Start para maglaro ulit.'},
    ko:{btn:'방',hello:'안녕하세요, {0}님!',ask:'어떻게 플레이하시겠어요?',soloT:'혼자 하기',soloD:'4개 층을 올라 혼자 힘으로 모든 보스를 쓰러뜨리세요.',soloB:'▶ 솔로 플레이',
      teamT:'친구와 함께 하기',teamD:'방을 만들고 친구에게 코드를 보내 함께 매치에 입장하세요.',teamB:'팀 플레이',back:'← 뒤로',
      createT:'방 만들기',createD:'당신이 방장입니다: 방 코드를 받아 친구를 초대하고, 모두 모이면 시작을 누르세요.',createB:'🏠 방 만들기',
      joinT:'방 입장',joinD:'방장이 보낸 5자리 방 코드를 입력하세요.',joinB:'방 입장',codePh:'코드',leave:'방 나가기',close:'닫기',
      connecting:'연결 중…',players:'플레이어',ping:'핑',
      e_code:'방 코드를 입력하세요 (5자리).',e_nocode:'이 코드의 방을 찾을 수 없습니다. 코드를 확인하거나, 방장이 방을 닫았을 수 있습니다.',
      e_conn:'연결할 수 없습니다. 인터넷이 필요하고 네트워크가 WebRTC를 차단하면 안 됩니다.',e_timeout:'시간이 초과되었습니다. 다시 시도하세요.',e_full:'방이 가득 찼습니다.',
      e_closed:'방장과의 연결이 끊어졌습니다.',e_hostleft:'방장이 방을 닫았습니다.',
      lobby:'대기실',inGame:'매치 진행 중',roomCode:'방 코드',copy:'코드 복사',copyLink:'초대 링크 복사',copied:'복사됨',
      shareH:'친구에게 코드나 초대 링크를 보내세요. 친구는 게임을 열고 “팀 플레이”를 선택한 뒤 코드를 입력하면 됩니다.',
      start:'▶ 시작',waitHost:'방장이 시작하기를 기다리는 중…',waitPlayers:'당신이 방장입니다. 모두 입장하면 시작을 누르세요.',
      youHost:'방 설정',pvp:'⚔️ PvP (플레이어끼리 피해를 줌)',bots:'🤖 봇 / 몬스터 (방장이 실행, 모두 같은 화면을 봄)',
      note:'참고: 봇과 보스는 방장이 실행하며 방에 동기화됩니다. 떨어지는 아이템은 각 PC에서 따로 실행되며, 방에서는 궁수가 일시적으로 비활성화됩니다.',hostTag:'방장',you:'나',
      kills:'킬',deaths:'데스',name:'이름',sbH:'점수판',chatPh:'메시지 입력… (Enter 전송, Esc 취소)',
      joined:'{0}님이 입장했습니다',left:'{0}님이 퇴장했습니다',died:'{0} ☠',lost:'연결 끊김',hint:'Enter: 채팅 · Tab: 점수판',
      go:'▶ 매치 입장',startedSub:'방장이 매치를 시작했습니다! 클릭해서 입장하세요.',needStart:'방장이 시작을 누를 때까지 기다려 주세요.',slotWait:'친구를 기다리는 중…',
      modeH:'게임 모드',time:'⏱ 매치당 5분',locked:'🔒 시간이 끝날 때까지 모드가 잠겨 있습니다.',onlyHost:'방장만 모드를 바꿀 수 있습니다.',
      m_ffa:'⚔️ 개인전 PvP',d_ffa:'모두가 서로 쏠 수 있습니다. 1킬 = 1점.',
      m_team:'🛡️ 팀전 PvP',d_team:'두 팀으로 나뉘며 대기실에서 팀을 고릅니다. 순위는 팀 기준입니다. 같은 팀끼리는 피해를 주지 않습니다.',
      m_ffabot:'⚔️🤖 개인전 PvP + 봇',d_ffabot:'모두가 서로 쏠 수 있고, 봇이 모든 플레이어를 공격합니다.',
      m_teambot:'🛡️🤖 팀전 PvP + 봇',d_teambot:'두 팀으로 나뉘며 봇이 양 팀을 모두 공격합니다.',
      m_peace:'🕊️ 평화',d_peace:'구경 전용: 2층, 3층으로 자유롭게 올라갈 수 있고 보스를 쓰러뜨릴 필요가 없습니다. 봇은 나타나 말도 하지만 공격하지 않습니다.',
      teamH:'팀 선택',t0:'🔴 Optimum Mascot',t1:'🔵 Optimum Ghost',endT:'시간 종료!',winT:'{0} 승리!',draw:'무승부!',pts:'점수',peaceEnd:'구경 시간이 끝났습니다. 방문해 주셔서 감사합니다!',again:'방장이 모드를 바꾸고 시작을 눌러 다시 플레이할 수 있습니다.'}
  };
  const tr=(k,...a)=>{let s=((NT[L]||NT.en)[k])||NT.en[k]||k;a.forEach((v,i)=>s=s.split('{'+i+'}').join(v));return s};
  const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
  const st=NET.st;
  const touch=()=>document.body.classList.contains('touch');

  // ---------- CSS ----------
  const css=document.createElement('style');
  css.textContent=`
#modes{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;overflow:hidden;
  background:#000;color:#2b2a3a}   /* nền đen + hạt (ui/menu-fx.js) */
#modes.on{display:flex}
body.modes-on #ov,body.modes-on #hud{visibility:hidden}   /* màn chọn nằm riêng: ẩn bảng hướng dẫn + HUD phía sau, chỉ còn cảnh game mờ */
#modes .mwrap{position:relative;z-index:1;width:min(94vw,860px);max-height:96vh;overflow-y:auto;padding:10px 6px;box-sizing:border-box;text-align:center}
#modes h1{margin:0;font:900 clamp(34px,7vw,60px)/1.05 "Trebuchet MS","Segoe UI",sans-serif;letter-spacing:.04em;color:#fff;text-shadow:0 4px 0 #ff7fa8,0 8px 0 #7fbfff,0 14px 22px rgba(30,30,60,.35)}
#modes .sub{margin:12px 0 20px;font-weight:800;font-size:clamp(16px,2.6vw,21px);color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.6)}
#modes .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px;margin:6px 0 14px}
#modes .mcard{display:flex;flex-direction:column;align-items:center;position:relative;border-radius:26px;padding:22px 20px 20px;border:4px solid;background:#fff;box-shadow:0 8px 0 rgba(43,42,58,.16),0 18px 34px rgba(30,30,60,.22);text-align:center;transition:transform .15s,box-shadow .15s}
#modes .mcard.pink{border-color:#ff7fa8;background:linear-gradient(#fff,#ffe9f1)}
#modes .mcard.blue{border-color:#7fbfff;background:linear-gradient(#fff,#e5f3ff)}
#modes .mcard.green{border-color:#6fd6a0;background:linear-gradient(#fff,#e5f9ee)}
#modes .mcard.btnlike{cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;outline:none}
#modes .mcard.btnlike:active{transform:translateY(2px) scale(.985);box-shadow:0 4px 0 rgba(43,42,58,.16),0 8px 18px rgba(30,30,60,.2)}
#modes .mcard.btnlike:focus-visible{box-shadow:0 0 0 5px #fff,0 8px 0 rgba(43,42,58,.16),0 18px 34px rgba(30,30,60,.22)}
#modes .mcard.whole{padding-bottom:22px}
#modes .mcard.whole p{margin-bottom:0;flex:0 0 auto;min-height:0}
#modes .mcard.btnlike:hover .pic img{transform:scale(1.05)}
#modes .mcard .pic img{transition:transform .2s}
#modes .mcard.btnlike:hover{transform:translateY(-6px) rotate(-.6deg);box-shadow:0 14px 0 rgba(43,42,58,.13),0 26px 40px rgba(30,30,60,.26)}
#modes .mcard .ic{font-size:64px;line-height:1;margin-bottom:6px;filter:drop-shadow(0 5px 0 rgba(43,42,58,.15))}
#modes .mcard .pic{width:100%;height:clamp(150px,28vh,240px);display:flex;align-items:center;justify-content:center;margin-bottom:8px}
#modes .mcard .pic img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;mix-blend-mode:multiply;pointer-events:none;-webkit-user-drag:none;user-select:none}   /* multiply: nền trắng của ảnh hòa vào màu gradient của thẻ, không lộ khung chữ nhật */
@media (max-height:520px){#modes .mcard .pic{height:clamp(70px,22vh,110px);margin-bottom:2px}#modes .mcard{padding:12px 14px 14px}#modes .mcard p{min-height:0;margin-bottom:8px}}
#modes .mcard h2{margin:4px 0 6px;font-size:24px}
#modes .mcard p{margin:0 0 14px;font-size:14.5px;line-height:1.5;opacity:.82;min-height:44px;flex:1}
#modes .mbtn{font:inherit;font-weight:800;font-size:18px;border:3px solid #2b2a3a;background:#fff;color:#2b2a3a;border-radius:14px;padding:10px 20px;cursor:pointer;box-shadow:0 4px 0 #2b2a3a;transition:transform .1s,box-shadow .1s}
#modes .mbtn:hover{transform:translateY(2px);box-shadow:0 2px 0 #2b2a3a}
#modes .mbtn:active{transform:translateY(4px);box-shadow:none}
#modes .mbtn.pk{background:#ff7fa8}#modes .mbtn.bl{background:#7fbfff}#modes .mbtn.gr{background:#6fd6a0}
#modes .mbtn:disabled{opacity:.5;cursor:default}
#modes .back{font:inherit;font-weight:800;border:0;background:rgba(255,255,255,.75);border-radius:12px;padding:7px 14px;cursor:pointer;margin-bottom:10px}
#modes input.cin{width:100%;box-sizing:border-box;text-transform:uppercase;letter-spacing:.35em;text-align:center;font:800 28px "Trebuchet MS",monospace;padding:8px 10px;margin-bottom:12px;border:3px solid #7fbfff;border-radius:14px;background:#fff;color:#2b2a3a;outline:none}
#modes .err{background:#ffe3e8;border:3px solid #ff6b86;color:#b3203d;font-weight:800;font-size:14px;line-height:1.45;border-radius:14px;padding:8px 12px;margin:6px auto 12px;max-width:620px}
#modes .room{background:#fff;border:4px solid #ff7fa8;border-radius:28px;padding:18px 20px;box-shadow:0 8px 0 rgba(43,42,58,.16),0 18px 34px rgba(30,30,60,.22);text-align:center}
#modes .room h2{margin:0 0 4px;font-size:22px}
#modes .code{display:inline-block;margin:6px auto 8px;font:900 clamp(38px,10vw,64px)/1 "Trebuchet MS",monospace;letter-spacing:.22em;padding:10px 6px 10px 22px;border:4px dashed #ff7fa8;border-radius:20px;background:linear-gradient(#fff,#fff0f5);user-select:all}
#modes .btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:8px 0}
#modes .sm{font-size:13px;opacity:.72;line-height:1.5}
#modes .plist{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin:12px 0;padding:0;list-style:none}
#modes .plist li{display:flex;align-items:center;gap:10px;background:#f3f8ff;border:3px solid #7fbfff;border-radius:16px;padding:8px 10px;text-align:left;animation:mpin .25s ease-out}
@keyframes mpin{from{transform:scale(.8);opacity:0}}
#modes .plist li.me{border-color:#ff7fa8;background:#fff0f5}
#modes .av{flex:0 0 38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px;color:#fff;box-shadow:inset -4px -4px 0 rgba(0,0,0,.14)}
#modes .pn{min-width:0}#modes .pn b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}
#modes .pn span{font-size:12px;opacity:.7}
#modes .opts{background:#f6f2ff;border:3px solid #b9a5ff;border-radius:16px;padding:8px 14px;margin:10px 0;text-align:left}
#modes .opts b{display:block;margin-bottom:4px}
#modes .chk{display:flex;gap:8px;align-items:center;font-size:15px;font-weight:700;margin:6px 0;cursor:pointer}
#modes .chk input{width:20px;height:20px;accent-color:#ff7fa8}
/* ---- sảnh chờ: cột thông tin ở GÓC PHẢI (.side) + sân khấu ở giữa (.stage), mỗi người chơi là 1 nhân vật họ đã chọn ---- */
#modes .mwrap.lobby{position:absolute;inset:0;width:auto;max-height:none;overflow:hidden;padding:clamp(10px,2.4vh,26px) clamp(12px,2vw,28px);display:flex;gap:clamp(12px,2vw,28px);align-items:stretch}
#modes .side{order:2;flex:0 0 clamp(250px,27vw,350px);display:flex;flex-direction:column;align-items:center;overflow-y:auto;scrollbar-width:none;padding:2px 2px 10px}
#modes .side::-webkit-scrollbar,#modes .stage::-webkit-scrollbar{display:none}
#modes .side h1{font-size:clamp(26px,3.3vw,50px)}
#modes .side .sub{margin:8px 0 12px;font-size:clamp(15px,1.5vw,20px)}
#modes .room.mini{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:22px}
#modes .room.mini .code{font-size:clamp(30px,4vw,50px);letter-spacing:.16em;padding:8px 4px 8px 16px;border-width:3px;margin:4px auto 6px}
#modes .room.mini .mbtn{font-size:15px;padding:7px 12px}
#modes .room.mini .opts{margin:8px 0;padding:6px 12px}
#modes .room.mini .chk{font-size:14px;margin:5px 0}
#modes .stage{order:1;flex:1 1 0;min-width:0;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;align-items:flex-end;gap:clamp(10px,2.4vh,26px) clamp(8px,1.4vw,22px);overflow-y:auto;scrollbar-width:none;padding:8px;--rows:1;--ph:clamp(96px,calc((100vh - 130px) / var(--rows) - 96px),340px)}   /* --ph: chiều cao nhân vật. Đây chỉ là giá trị khởi đầu: fitStage() (JS) đo khung thật rồi chọn cỡ lớn nhất mà mọi người vẫn vừa, không phải cuộn */
#modes .pl{display:flex;flex-direction:column;align-items:center;max-width:calc(var(--ph) * .95)}
#modes .pl.new{animation:ppop .45s cubic-bezier(.2,1.4,.4,1) both}   /* chỉ người MỚI vào mới nảy lên (render lại định kỳ không làm nháy) */
@keyframes ppop{from{transform:translateY(40px) scale(.5);opacity:0}}
#modes .fig{position:relative;height:var(--ph);aspect-ratio:260/360}
#modes .gs{position:absolute;left:2%;right:2%;bottom:-2%;height:13%;border-radius:50%;background:radial-gradient(closest-side,rgba(127,191,255,.55),rgba(127,191,255,0))}   /* vòng sáng dưới chân */
#modes .pl.me .gs{background:radial-gradient(closest-side,rgba(255,127,168,.65),rgba(255,127,168,0))}
#modes .pch{position:absolute;inset:0;animation:pbob 3.2s ease-in-out infinite;transform-origin:50% 100%}
@keyframes pbob{50%{transform:translateY(-2.2%)}}
#modes .pch canvas{position:static;inset:auto;display:block;width:100%;height:100%;pointer-events:none;z-index:auto}   /* style.css đặt MỌI canvas ở position:fixed toàn màn hình -> phải ghi đè */
#modes .avbig{position:absolute;inset:8% 14% 4%;display:flex;align-items:center;justify-content:center;border-radius:22px;font:900 clamp(36px,9vh,80px)/1 "Trebuchet MS",sans-serif;color:#fff;box-shadow:inset -8px -8px 0 rgba(0,0,0,.16)}   /* dự phòng khi thiếu nhân vật */
#modes .tag{margin-top:8px;max-width:100%;min-width:min(100%,92px);box-sizing:border-box;text-align:center;background:#fff;border:3px solid #7fbfff;border-radius:14px;padding:4px 10px 5px;box-shadow:0 4px 0 rgba(43,42,58,.2);color:#2b2a3a}
#modes .pl.me .tag{border-color:#ff7fa8;background:#fff0f5}
#modes .tag b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:clamp(13px,1.9vh,17px)}
#modes .tag span{display:block;font-size:clamp(11px,1.5vh,13px);opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#modes .pl.ghost .fig{height:calc(var(--ph) * .5);border:3px dashed rgba(255,255,255,.3);border-radius:18px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.35);font:900 clamp(36px,8vh,76px)/1 "Trebuchet MS",sans-serif}
#modes .pl.ghost .tag{background:transparent;border:0;box-shadow:none;color:rgba(255,255,255,.75);padding-top:0;min-width:0}
#modes .pl.ghost{max-width:calc(var(--ph) * .62)}
#modes .pl.ghost .tag b{white-space:normal;font-size:clamp(11px,1.5vh,14px);line-height:1.25}
@media (max-width:660px){#modes .mwrap.lobby{flex-direction:column;overflow-y:auto}#modes .side{order:1;flex:0 0 auto;width:100%;overflow:visible}#modes .stage{order:2;flex:0 0 auto;overflow:visible;--ph:clamp(96px,32vw,200px)}}
#modes .room.mini .mbtn.big{font-size:22px;padding:10px 26px;margin-top:4px}
@media (max-height:520px){   /* điện thoại nằm ngang: gọn cột thông tin để thấy hết nút Start / Leave không cần cuộn */
  #modes .mwrap.lobby{padding:6px 12px}
  #modes .side{flex-basis:clamp(220px,32vw,270px)}
  #modes .side h1{font-size:clamp(20px,3vw,28px)}
  #modes .side .sub{margin:7px 0 6px;font-size:13px}
  #modes .room.mini{padding:7px 10px;border-radius:18px;border-width:3px}
  #modes .room.mini .sm.x{display:none}
  #modes .room.mini .code{font-size:28px;margin:2px auto 4px;padding:3px 4px 3px 12px}
  #modes .room.mini .btns{margin:4px 0;gap:6px}
  #modes .room.mini .mbtn{font-size:12px;padding:4px 8px;border-width:2px;box-shadow:0 3px 0 #2b2a3a}
  #modes .room.mini .opts{margin:4px 0;padding:3px 10px;border-width:2px}
  #modes .room.mini .opts b{margin-bottom:0;font-size:12px}
  #modes .room.mini .chk{font-size:11px;margin:3px 0;gap:6px}
  #modes .room.mini .chk input{width:16px;height:16px}
  #modes .room.mini .mbtn.big{font-size:16px;padding:5px 16px;margin-top:2px}
  #modes .side>.btns{margin:6px 0 0!important}
  #modes .side>.btns .mbtn{font-size:12px;padding:4px 10px}
  #modes .tag{margin-top:4px;padding:2px 8px 3px;border-width:2px}
  #modes .stage{padding:4px;gap:6px 8px}
}
#modes .wait{font-weight:800;font-size:17px;margin:10px 0;animation:mwait 1.4s ease-in-out infinite}
@keyframes mwait{50%{opacity:.45}}
.lb.lan{display:none;border-color:#3dd17a;background:#3dd17a;color:#14301f}.lb.lan.live{display:inline-block}
#netbar{position:absolute;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);display:none;gap:8px;align-items:center;font-size:14px;padding:5px 12px;pointer-events:none;white-space:nowrap}
#netbar .nb{pointer-events:auto;font:inherit;border:2px solid #2b2a3a;background:#fff;border-radius:9px;padding:0 7px;cursor:pointer;display:none}
body.touch #netbar .nb{display:inline-block}
#netbar .hint{opacity:.6;font-size:12px}body.touch #netbar .hint{display:none}
#kfeed{position:absolute;right:16px;top:calc(64px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;align-items:flex-end;gap:4px}
#kfeed div{background:rgba(255,255,255,.9);border-radius:10px;padding:3px 10px;font-size:14px;animation:kfin .2s ease-out}
#kfeed .me{outline:2px solid var(--pink)}
@keyframes kfin{from{opacity:0;transform:translateX(14px)}}
#lchat{position:absolute;left:16px;bottom:calc(112px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:3px;max-width:min(46vw,440px)}
body.touch #lchat{bottom:calc(80px + env(safe-area-inset-bottom,0px));left:calc(12px + env(safe-area-inset-left,0px));font-size:12px}
#lchat div{background:rgba(255,255,255,.88);border-radius:9px;padding:3px 9px;font-size:14px;line-height:1.35;word-break:break-word;transition:opacity .5s}
#lchat div.old{opacity:0}
#lchat.open div.old{opacity:1}
#lchat .sys{opacity:.8;font-style:italic}
#lanchatw{position:fixed;left:50%;bottom:calc(120px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:8;display:none;width:min(92vw,520px)}
#lanchat{width:100%;box-sizing:border-box;font:700 17px "Segoe UI","Noto Sans","Noto Sans Bengali","Noto Sans Devanagari","Noto Sans SC","Microsoft YaHei","Malgun Gothic",sans-serif;padding:9px 12px;border:3px solid var(--pink);border-radius:12px;background:rgba(255,255,255,.96);color:#2b2a3a;outline:none}
#lansb{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;width:min(92vw,560px);max-height:80vh;overflow:auto;background:rgba(255,255,255,.95);border-radius:18px;padding:12px 16px;box-shadow:0 0 0 3px #2b2a3a}
#lansb h3{margin:0 0 6px;text-align:center;font-size:18px}
#lansb .rt{text-align:center;font-weight:800;font-size:14px;margin-bottom:6px;opacity:.8}
#lansb table{width:100%;border-collapse:collapse;font-size:15px}
#lansb th{font-size:12px;opacity:.7;text-align:right;padding:2px 6px}
#lansb th:first-child,#lansb td:first-child{text-align:left}
#lansb td{padding:4px 6px;text-align:right;border-top:1px solid rgba(0,0,0,.1)}
#lansb td:first-child{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#lansb tr.me td{background:rgba(255,127,168,.22);font-weight:bold}
#lrank{position:absolute;left:16px;top:calc(64px + env(safe-area-inset-top,0px));display:none;min-width:150px;max-width:230px;background:rgba(20,20,30,.62);color:#fff;border-radius:12px;padding:6px 10px;font-size:13px;line-height:1.45;pointer-events:none}
#lrank .rt{font-weight:800;margin-bottom:3px;white-space:nowrap}
#lrank .rr{font-weight:800}
#lrank .rp{display:flex;justify-content:space-between;gap:10px;white-space:nowrap}
#lrank .rp.me{background:rgba(255,255,255,.2);border-radius:6px;padding:0 4px;margin:0 -4px}
body.touch #lrank{font-size:11px;min-width:120px;left:calc(12px + env(safe-area-inset-left,0px));top:calc(54px + env(safe-area-inset-top,0px))}
#modes .room.mini .opts input[type=radio]{accent-color:#7a5cff}
#modes .room.mini .opts .sm{margin:2px 0}
#modes .room.mini .opts.team .btns .mbtn{font-size:15px;padding:6px 14px}
#modes .res{background:#fffbe6;border:4px solid #ffd23f;border-radius:22px;padding:10px 14px;margin:0 0 12px;text-align:center;box-shadow:0 6px 0 rgba(43,42,58,.14)}
#modes .res h2{margin:0 0 4px;font-size:22px}
#modes .res table{width:100%;border-collapse:collapse;font-size:14px;margin-top:6px}
#modes .res td{padding:2px 4px;text-align:right}#modes .res td:first-child{text-align:left}`;
  document.head.appendChild(css);

  // nút nhỏ trên bảng "Bấm để chơi" - CHỈ hiện khi đang ở trong phòng (xem mã phòng / người chơi / rời phòng)
  const btn=el('button','lb lan','🌐');btn.type='button';
  $('go').before(btn);
  btn.addEventListener('click',e=>{e.stopPropagation();open()});

  // ---------- màn hình chọn cách chơi ----------
  const modes=el('div');modes.id='modes';
  const wrap=el('div','mwrap');modes.append(wrap);document.body.appendChild(modes);
  if(window.MenuFX)MenuFX.attach(modes);
  let view='mode',codeVal='';
  const isOpen=()=>modes.classList.contains('on');
  const show=()=>{render();modes.classList.add('on');document.body.classList.add('modes-on');fitStage()};
  const hide=()=>{modes.classList.remove('on');document.body.classList.remove('modes-on')};
  const open=()=>{if(st.on||st.connecting)view='room';show()};
  const close=hide;
  const copy=(txt,b)=>{try{navigator.clipboard.writeText(txt)}catch(e){}const o=b.textContent;b.textContent='✔ '+tr('copied');setTimeout(()=>b.textContent=o,1200)};
  const inviteLink=()=>(location.protocol==='file:'?'':location.origin)+location.pathname+'?room='+st.code;
  const sorted=()=>Array.from(NET.roster.values()).sort((a,b)=>b.k-a.k||a.d-b.d||a.name.localeCompare(b.name));
  const COL=['#ff7fa8','#7fbfff','#6fd6a0','#ffb347','#b9a5ff','#4dd0e1','#f06292','#9ccc65'];
  const initial=n=>Array.from(String(n||'?'))[0].toUpperCase();
  const MODE_IDS=['ffa','team','ffabot','teambot','peace'],TEAMC=['#ff5a5f','#3b82f6'];
  const teamName=i=>tr('t'+(i?1:0));
  function teamScores(list){const s=[{k:0,d:0,n:0},{k:0,d:0,n:0}];for(const p of list){const t=p.tm?1:0;s[t].k+=p.k|0;s[t].d+=p.d|0;s[t].n++}return s}
  const isTeamMode=m=>m==='team'||m==='teambot';
  // bảng kết quả trận vừa xong (hiện ở sảnh chờ sau khi hết 5 phút)
  function resultCard(){
    const R=st.result,c=el('div','res');c.appendChild(el('h2',null,'⏱ '+tr('endT')));
    if(R.mode==='peace'){c.appendChild(el('div','sm',tr('peaceEnd')));return c}
    const L2=R.list.slice().sort((a,b)=>b.k-a.k||a.d-b.d||a.name.localeCompare(b.name));
    if(isTeamMode(R.mode)){
      const s=teamScores(R.list);
      c.appendChild(el('div','',s[0].k===s[1].k?tr('draw'):'🏆 '+tr('winT',teamName(s[0].k>s[1].k?0:1))));
      const t=el('table');
      for(const i of[0,1]){const r=el('tr');r.style.color=TEAMC[i];r.style.fontWeight='800';r.append(el('td',null,teamName(i)),el('td',null,tr('pts')+': '+s[i].k));t.appendChild(r)}
      c.appendChild(t);
    }else if(L2.length){
      c.appendChild(el('div','',L2.length>1&&L2[0].k===L2[1].k&&L2[0].d===L2[1].d?tr('draw'):'🏆 '+tr('winT',L2[0].name)));
    }
    const t=el('table');
    L2.slice(0,8).forEach((p,i)=>{const r=el('tr');if(isTeamMode(R.mode))r.style.color=TEAMC[p.tm?1:0];if(p.id===st.id)r.style.fontWeight='800';
      r.append(el('td',null,(i+1)+'. '+p.name),el('td',null,'🎯 '+p.k+'  ☠ '+p.d));t.appendChild(r)});
    c.appendChild(t);c.appendChild(el('div','sm',tr('again')));
    return c;
  }

  function header(sub,parent){
    parent=parent||wrap;
    parent.appendChild(el('h1',null,'BLOCK ARENA'));
    parent.appendChild(el('div','sub',sub));
  }

  // ---------- nhân vật người chơi trong sảnh chờ ----------
  // Mỗi người chơi hiện đúng nhân vật họ đã chọn (p.ch = mã nhân vật, gửi qua hub). Ảnh chụp bằng CharPick.snapshot (ui/character.js, cùng lõi voxel với màn chọn nhân vật)
  // rồi CACHE theo (nhân vật, góc xoay): render() chạy lại thường xuyên nhưng chỉ vẽ lại canvas từ cache, không dựng lại WebGL.
  const CHC={},seenIds=new Set();let fresh=0;
  function charCanvas(k,ry){
    const key=k+'|'+ry;if(CHC[key])return CHC[key];
    if(!window.CharPick||!CharPick.snapshot||!window.THREE||!(CharPick.list||[]).some(c=>c.k===k))return null;   // thiếu module / mã lạ -> dùng ô chữ cái dự phòng
    try{const c=CharPick.snapshot(k,260,360,ry);fresh++;return CHC[key]=c}catch(e){console.warn('[LanUI] không chụp được nhân vật',k,e);return null}
  }
  function freeGL(){   // chụp xong thì trả WebGL (trừ khi màn chọn nhân vật đang mở bằng nút ✏️)
    const pf=document.getElementById('pf');
    if(window.CharPick&&CharPick.release&&(!pf||pf.style.display==='none'))try{CharPick.release()}catch(e){}
  }
  function playerSlot(p,i,t){
    const li=el('div','pl'+(p.me?' me':'')+(seenIds.has(p.id)?'':' new'));seenIds.add(p.id);
    const fig=el('div','fig'),pch=el('div','pch');
    if(st.cfg.team){fig.style.setProperty('filter','drop-shadow(0 0 6px '+TEAMC[p.tm?1:0]+')')}   // chơi theo phe: viền sáng màu phe quanh nhân vật
    pch.style.animationDelay=-((t+i*.45)%3.2)+'s';   // mỗi người nhún lệch nhịp; trừ theo đồng hồ để render lại không giật
    const src=charCanvas(p.ch,i%2?.45:-.45);   // xen kẽ quay nhẹ trái / phải cho sinh động
    if(src){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);pch.appendChild(c)}
    else{const a=el('div','avbig',initial(p.name));a.style.background=COL[(p.id|0)%COL.length];pch.appendChild(a)}
    fig.append(el('div','gs'),pch);
    const tag=el('div','tag');tag.title=p.name;if(st.cfg.team)tag.style.borderColor=TEAMC[p.tm?1:0];
    tag.appendChild(el('b',null,(p.host?'👑 ':'')+p.name));
    const sub=st.started?'🎯 '+p.k+'   ☠ '+p.d:[st.cfg.team?teamName(p.tm):'',p.host?tr('hostTag'):'',p.me?tr('you'):''].filter(Boolean).join(' · ');
    tag.appendChild(el('span',null,sub||' '));
    li.append(fig,tag);return li;
  }
  function buildStage(stage){
    const list=st.started?sorted():Array.from(NET.roster.values()).sort((a,b)=>(st.cfg.team?(a.tm|0)-(b.tm|0):0)||a.id-b.id);   // sảnh chờ: theo thứ tự vào phòng (chủ phòng đầu tiên); trong trận: theo điểm
    const ghost=!st.started&&list.length<st.cfg.max;   // ô trống "đang chờ bạn bè" cho đỡ trống trải
    const n=list.length+(ghost?1:0);stage.style.setProperty('--rows',n<=6?1:n<=12?2:3);
    const t=performance.now()/1000;
    list.forEach((p,i)=>stage.appendChild(playerSlot(p,i,t)));
    if(ghost){
      const g=el('div','pl ghost'),fig=el('div','fig','+'),tag=el('div','tag');tag.appendChild(el('b',null,tr('slotWait')));tag.appendChild(el('span',null,' '));
      g.append(fig,tag);stage.appendChild(g);
    }
    if(fresh){fresh=0;freeGL()}
  }
  // đo khung thật rồi chọn cỡ nhân vật LỚN NHẤT mà mọi người (và ô chờ) vẫn nằm vừa, không bị cuộn / cắt - màn nào, số người nào cũng vừa
  function fitStage(){
    const s=wrap.querySelector('.stage');if(!s||!isOpen())return;
    if(innerWidth<=660){s.style.removeProperty('--ph');return}   // màn hẹp: bố cục cột, cuộn bình thường (CSS lo)
    let ph=Math.min(360,s.clientHeight-50);
    for(;ph>72;ph-=6){s.style.setProperty('--ph',ph+'px');if(s.scrollHeight<=s.clientHeight+1)break}
    s.style.setProperty('--ph',Math.max(72,ph)+'px');
  }
  addEventListener('resize',()=>{if(view==='room')fitStage()});
  function chk(label,val,fn){
    const l=el('label','chk'),i=el('input');i.type='checkbox';i.checked=!!val;i.addEventListener('change',()=>fn(i.checked));
    l.append(i,el('span',null,label));return l;
  }
  function card(cls,icon,title,desc,btnTxt,btnCls,fn){
    const c=el('div','mcard '+cls);
    // icon dạng 'img:đường/dẫn.jpg' -> hiện ẢNH (khung .pic) thay vì emoji; các thẻ khác vẫn dùng emoji như cũ
    if(typeof icon==='string'&&icon.slice(0,4)==='img:'){
      const pic=el('div','pic'),im=el('img');im.src=icon.slice(4);im.alt=title;im.draggable=false;im.decoding='async';
      pic.appendChild(im);c.append(pic);
    }else c.append(el('div','ic',icon));
    c.append(el('h2',null,title),el('p',null,desc));
    const b=el('button','mbtn '+btnCls,btnTxt);b.type='button';b.addEventListener('click',e=>{e.stopPropagation();fn()});c.appendChild(b);
    return c;
  }
  // Thẻ chọn chế độ (Solo / Team): KHÔNG có nút con, cả thẻ là nút - bấm vào đâu trên thẻ cũng chọn luôn (chuột, cảm ứng, hoặc Tab + Enter / Space)
  function modeCard(cls,img,title,desc,fn){
    const c=el('div','mcard btnlike whole '+cls);
    c.tabIndex=0;c.setAttribute('role','button');c.setAttribute('aria-label',title);
    const pic=el('div','pic'),im=el('img');im.src=img;im.alt='';im.draggable=false;im.decoding='async';pic.appendChild(im);
    c.append(pic,el('h2',null,title),el('p',null,desc));
    const act=e=>{e.stopPropagation();fn()};
    c.addEventListener('click',act);
    c.addEventListener('keydown',e=>{e.stopPropagation();if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();fn()}});   // chặn phím lọt xuống phím tắt của game
    c.addEventListener('keyup',e=>e.stopPropagation());
    return c;
  }

  function render(){
    const old=wrap.querySelector('#lancode');if(old)codeVal=old.value;
    wrap.textContent='';wrap.className='mwrap';
    if(st.on||st.connecting)view='room';
    else if(view==='room')view='team';
    if(view!=='room')seenIds.clear();   // rời phòng: lần sau vào lại, mọi người nảy lên như mới

    if(view==='mode'){   // ---- Solo hay Team ----
      header(tr('hello',PROFILE.name||'')+'  '+tr('ask'));
      const row=el('div','row');
      row.appendChild(modeCard('pink','assets/img/mode-solo.jpg',tr('soloT'),tr('soloD'),solo));   // solo: nhân vật xé áo - bấm cả thẻ là vào chơi
      row.appendChild(modeCard('blue','assets/img/mode-team.jpg',tr('teamT'),tr('teamD'),()=>{view='team';render()}));   // team: nhiều người - bấm cả thẻ là sang bước tạo / vào phòng
      wrap.appendChild(row);
    }else if(view==='team'){   // ---- Tạo phòng hay Vào phòng ----
      header(tr('teamT'));
      const bk=el('button','back',tr('back'));bk.type='button';bk.addEventListener('click',()=>{NET.st.err='';view='mode';render()});wrap.appendChild(bk);
      if(st.err)wrap.appendChild(el('div','err','⚠️ '+tr('e_'+st.err)));
      const row=el('div','row');
      row.appendChild(card('pink','🏠',tr('createT'),tr('createD'),tr('createB'),'pk',()=>NET.createRoom()));
      // thẻ "Vào phòng" có ô nhập mã
      const jc=el('div','mcard blue');jc.append(el('div','ic','🔑'),el('h2',null,tr('joinT')),el('p',null,tr('joinD')));
      const inp=el('input','cin');inp.type='text';inp.id='lancode';inp.placeholder=tr('codePh');inp.maxLength=8;inp.value=codeVal;inp.autocomplete='off';inp.spellcheck=false;
      inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')go()});inp.addEventListener('keyup',e=>e.stopPropagation());
      inp.addEventListener('input',()=>{inp.value=inp.value.toUpperCase().replace(/[^A-Z0-9]/g,'')});
      const jb=el('button','mbtn bl',tr('joinB'));jb.type='button';jb.addEventListener('click',()=>go());
      jc.append(inp,jb);row.appendChild(jc);wrap.appendChild(row);
      const go=()=>{codeVal=inp.value;NET.joinRoom(codeVal)};
      setTimeout(()=>{if(!touch()&&isOpen()&&view==='team'&&codeVal)inp.focus()},30);
    }else{   // ---- phòng: kết nối / sảnh chờ / đang trong trận ----
      // Bố cục: cột thông tin (.side) ở GÓC PHẢI · giữa màn hình là sân khấu (.stage) - mỗi người chơi là 1 nhân vật họ đã chọn (thay cho bảng trắng + danh sách chữ cũ)
      wrap.className='mwrap lobby';
      const stage=el('div','stage'),side=el('div','side');wrap.append(stage,side);
      header(st.connecting&&!st.on?tr('connecting'):(st.started?tr('inGame'):tr('lobby')),side);
      const room=el('div','room mini');
      if(!st.on){
        room.appendChild(el('div','wait','⏳ '+tr('connecting')+(st.code?'  '+st.code:'')));
      }else{
        room.appendChild(el('div','sm x',tr('roomCode')));
        room.appendChild(el('div','code',st.code));
        const bs=el('div','btns');
        const b1=el('button','mbtn',tr('copy'));b1.type='button';b1.addEventListener('click',()=>copy(st.code,b1));
        const b2=el('button','mbtn',tr('copyLink'));b2.type='button';b2.addEventListener('click',()=>copy(inviteLink(),b2));
        bs.append(b1,b2);room.appendChild(bs);
        if(st.host&&!st.started)room.appendChild(el('div','sm x',tr('shareH')));
        room.appendChild(el('div','sm','👥 '+tr('players')+': '+NET.roster.size+' / '+st.cfg.max+(st.started?'  ·  '+tr('ping')+': '+st.ping+' ms':'')));
        buildStage(stage);   // danh sách người chơi -> các nhân vật ở giữa màn hình
        {   // chế độ chơi: chủ phòng chọn 1 trong 5 (khóa khi đã vào trận), người khác chỉ xem
          const o=el('div','opts');o.appendChild(el('b',null,tr('modeH')));
          const lockedUI=st.started||!st.host;
          for(const m of MODE_IDS){
            const l=el('label','chk'),i=el('input');i.type='radio';i.name='lanmode';i.checked=st.cfg.mode===m;i.disabled=lockedUI;
            i.addEventListener('change',()=>{if(i.checked)NET.setCfg({mode:m})});
            const sp=el('span',null,tr('m_'+m));sp.title=tr('d_'+m);l.append(i,sp);o.appendChild(l);
          }
          o.appendChild(el('div','sm',tr('d_'+st.cfg.mode)));
          o.appendChild(el('div','sm',tr('time')));
          if(st.started)o.appendChild(el('div','sm',tr('locked')));else if(!st.host)o.appendChild(el('div','sm',tr('onlyHost')));
          room.appendChild(o);
        }
        if(st.cfg.team&&!st.started){   // chọn phe
          const o=el('div','opts team');o.appendChild(el('b',null,tr('teamH')));
          const row=el('div','btns'),my=NET.myTeam();
          for(const i of[0,1]){const b=el('button','mbtn',teamName(i)),on=my===i;b.type='button';b.style.background=on?TEAMC[i]:'#fff';b.style.color=on?'#fff':'#2b2a3a';b.addEventListener('click',()=>NET.setTeam(i));row.appendChild(b)}
          o.appendChild(row);room.appendChild(o);
        }
        if(st.host){
          if(!st.started){const sb=el('button','mbtn gr big',tr('start'));sb.type='button';sb.addEventListener('click',()=>NET.start());room.appendChild(sb)}
        }else if(!st.started)room.appendChild(el('div','wait','⏳ '+tr('waitHost')));
        room.appendChild(el('div','sm x',tr('note')));
      }
      if(!st.started&&st.result)side.appendChild(resultCard());   // kết quả trận vừa xong
      side.appendChild(room);
      const bs=el('div','btns');bs.style.marginTop='12px';
      const lv=el('button','mbtn',tr('leave'));lv.type='button';lv.addEventListener('click',()=>{NET.leave();view='mode';render()});bs.appendChild(lv);
      if(st.started){const cl=el('button','mbtn pk',tr('close'));cl.type='button';cl.addEventListener('click',close);bs.appendChild(cl)}
      side.appendChild(bs);
      fitStage();   // (đang mở sẵn: đo lại ngay; lần mở đầu tiên thì show() gọi sau khi hiện khung)
    }
  }
  // Solo: rời phòng (nếu đang ở trong) rồi vào bảng "Bấm để chơi"
  function solo(){if(st.on||st.connecting)NET.leave(true);hide();view='mode'}
  // profile.js gọi khi chọn xong nhân vật
  function afterProfile(){document.body.classList.remove('pfon');if(st.on||st.connecting){open();return}view='mode';show()}

  // ---------- HUD ----------
  const hud=$('hud');
  const bar=el('div','pill');bar.id='netbar';
  const barT=el('span');const bSb=el('button','nb','👥'),bCh=el('button','nb','💬'),hint=el('span','hint');
  bar.append(barT,bSb,bCh,hint);hud.appendChild(bar);
  const feed=el('div');feed.id='kfeed';hud.appendChild(feed);
  const rank=el('div');rank.id='lrank';hud.appendChild(rank);
  // Bảng xếp hạng góc màn hình đã bỏ (che bản đồ). Đồng hồ + điểm phe + xếp hạng giờ chỉ hiện trong bảng Tab (drawSb).
  const leftSec=()=>Math.max(0,Math.ceil((st.endAt-performance.now())/1000));
  const fmtT=n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
  function drawRank(){rank.style.display='none'}
  setInterval(()=>{if(sbOn)drawSb()},500);   // bảng Tab đang mở: cập nhật đồng hồ
  const chatLog=el('div');chatLog.id='lchat';hud.appendChild(chatLog);
  const sb=el('div');sb.id='lansb';hud.appendChild(sb);
  const chatW=el('div');chatW.id='lanchatw';const chatI=el('input');chatI.id='lanchat';chatI.type='text';chatI.maxLength=160;chatI.autocomplete='off';chatI.spellcheck=false;
  chatW.appendChild(chatI);document.body.appendChild(chatW);

  function updBar(){
    const on=st.on&&st.started;bar.style.display=on?'flex':'none';
    btn.classList.toggle('live',st.on);btn.textContent=st.on?'🌐 '+st.code+' · '+NET.roster.size:'🌐';
    if(on){barT.textContent='🌐 '+st.code+' · 👥 '+NET.roster.size+' · '+st.ping+' ms'+(st.cfg.pvp?' · ⚔️':'');hint.textContent=tr('hint')}
    else{sb.style.display='none';closeChat()}
    drawRank();
  }
  function drawSb(){
    sb.textContent='';sb.appendChild(el('h3',null,'🏆 '+tr('sbH')+' · '+(st.cfg.name||'')));
    sb.appendChild(el('div','rt','⏱ '+fmtT(leftSec())+' · '+tr('m_'+st.cfg.mode)));
    if(st.cfg.team){const s=teamScores(Array.from(NET.roster.values())),d=el('div');d.style.cssText='display:flex;justify-content:space-around;font-weight:800;margin-bottom:6px';
      for(const i of[0,1]){const x=el('span',null,teamName(i)+': '+s[i].k);x.style.color=TEAMC[i];d.appendChild(x)}sb.appendChild(d)}
    const t=el('table'),h=el('tr');for(const c of[tr('name'),tr('kills'),tr('deaths'),tr('ping')])h.appendChild(el('th',null,c));t.appendChild(h);
    for(const p of sorted()){const r=el('tr',p.me?'me':'');if(st.cfg.team)r.style.boxShadow='inset 4px 0 0 '+TEAMC[p.tm?1:0];r.appendChild(el('td',null,(p.host?'👑 ':'')+p.name));for(const v of[p.k,p.d,p.ping+' ms'])r.appendChild(el('td',null,String(v)));t.appendChild(r)}
    sb.appendChild(t);
  }
  let sbOn=false;
  function showSb(v){sbOn=v&&st.on&&st.started;sb.style.display=sbOn?'block':'none';if(sbOn)drawSb()}
  bSb.addEventListener('click',()=>showSb(!sbOn));

  // kill feed: tối đa 5 dòng, mỗi dòng tồn tại 6 giây
  function pushFeed(k,v,hs){
    const d=el('div',(k&&k.me)||(v&&v.me)?'me':'');
    d.textContent=k?k.name+(hs?' 🎯 ':' 🔫 ')+(v?v.name:'?'):tr('died',v?v.name:'?');
    feed.appendChild(d);while(feed.children.length>5)feed.firstChild.remove();
    setTimeout(()=>d.remove(),6000);
  }
  // chat: hiện 8 giây rồi mờ dần (đang mở ô nhập thì hiện hết)
  function pushChat(name,text,sys){
    const d=el('div',sys?'sys':'');
    if(sys)d.textContent=text;else{const b=el('b',null,name+': ');d.append(b,document.createTextNode(text))}
    chatLog.appendChild(d);while(chatLog.children.length>8)chatLog.firstChild.remove();
    setTimeout(()=>d.classList.add('old'),8000);
  }

  // ---------- chat: Enter / T ----------
  function openChat(){
    if(NET.typing||!st.on||!st.started)return;
    NET.typing=true;for(const k in keys)keys[k]=0;   // nhả mọi phím đang giữ để nhân vật không tự chạy
    md=false;chatW.style.display='block';chatLog.classList.add('open');chatI.placeholder=tr('chatPh');chatI.value='';chatI.focus();
  }
  function closeChat(){
    if(!NET.typing)return;
    NET.typing=false;chatW.style.display='none';chatLog.classList.remove('open');chatI.blur();
  }
  chatI.addEventListener('keydown',e=>{
    e.stopPropagation();   // phím gõ chat không lọt xuống phím tắt của game
    if(e.key==='Enter'&&!e.isComposing){NET.chat(chatI.value);closeChat()}
    else if(e.key==='Escape')closeChat();
  });
  chatI.addEventListener('keyup',e=>e.stopPropagation());
  chatI.addEventListener('blur',()=>setTimeout(closeChat,0));
  addEventListener('mousedown',e=>{if(NET.typing)e.stopImmediatePropagation()},true);   // đang gõ chat: bấm chuột không bắn
  bCh.addEventListener('click',()=>{if(NET.typing)closeChat();else openChat()});

  addEventListener('keydown',e=>{
    if(!st.on||!st.started||NET.typing||e.repeat)return;
    if(e.code==='Tab'){if(!playing)return;e.preventDefault();showSb(true)}   // chỉ khi đang chơi (ngoài game Tab dùng để di chuyển giữa các nút)
    else if((e.code==='Enter'||e.code==='KeyT')&&playing){e.preventDefault();openChat()}
  });
  addEventListener('keyup',e=>{if(e.code==='Tab'&&sbOn){e.preventDefault();showSb(false)}});
  addEventListener('blur',()=>showSb(false));

  // ---------- nối với NET ----------
  NET.sub('status',()=>{
    updBar();
    if(!st.on&&!st.connecting&&st.err){   // thất bại / mất kết nối / chủ phòng đóng phòng -> về màn chọn, hiện lý do
      view='team';if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();show();
    }else if(isOpen())render();
  });
  NET.sub('score',()=>{updBar();if(sbOn)drawSb();if(isOpen())render()});
  NET.sub('cfg',()=>{if(isOpen())render()});
  NET.sub('end',()=>{showSb(false);closeChat();$('ov').style.display='none';view='room';updBar();show()});   // hết 5 phút: về sảnh chờ kèm bảng kết quả, chủ phòng đổi chế độ được lại
  NET.sub('join',p=>pushChat('',tr('joined',p.name),true));
  NET.sub('leave',p=>pushChat('',tr('left',p.name),true));
  NET.sub('kill',o=>pushFeed(o.k,o.v,o.hs));
  NET.sub('chat',o=>{pushChat(o.name,o.text,false);if(window.NetAvatar&&NetAvatar.say)NetAvatar.say(o.id,o.text)});   // + bong bóng thoại trên đầu người nói (net/avatar.js)
  // chủ phòng bấm Bắt đầu: đóng sảnh, bảng "Bấm để chơi" hiện sẵn với nút "Vào trận" (trình duyệt cần 1 cú bấm để khoá chuột)
  NET.sub('start',()=>{
    hide();
    $('ov').style.display='flex';
    if(typeof ovState!=='undefined'&&ovState==='dead')return;
    $('sub').textContent=tr('startedSub');$('go').textContent=tr('go');
  });
  // chưa tới lúc bắt đầu thì không cho vào game: mở lại sảnh chờ
  document.addEventListener('click',e=>{
    if(st.on&&!st.started&&e.target.closest&&e.target.closest('#ov')&&!e.target.closest('.lb')&&!e.target.closest('.wb')){
      e.stopPropagation();e.preventDefault();showMsg(tr('needStart'));open();
    }
  },true);
  setInterval(()=>{if(st.on){updBar();if(isOpen())render()}},4000);   // ping / số người cập nhật định kỳ

  // link mời ?room=MÃ : đợi người chơi qua màn chọn ngôn ngữ / tên / nhân vật (#pf ẩn đi) rồi tự vào phòng. (Khi đó profile.js gọi afterProfile -> bỏ qua vì đang vào phòng)
  const rm=(new URLSearchParams(location.search).get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  let pending=rm.length>=4?rm:'';
  const origAfter=afterProfile;
  function afterProfile2(){
    if(pending){const c=pending;pending='';codeVal=c;view='team';NET.joinRoom(c);view='room';show();return}
    origAfter();
  }

  // đổi ngôn ngữ (i18n.js phát 'ba-lang'): vẽ lại màn chọn đang mở + HUD + ô chat + bảng "Vào trận" cho khớp ngôn ngữ mới
  document.addEventListener('ba-lang',()=>{
    if(isOpen())render();
    updBar();
    if(sbOn)drawSb();
    if(NET.typing)chatI.placeholder=tr('chatPh');
    if(st.on&&st.started&&$('ov').style.display==='flex'&&ovState!=='dead'&&ovState!=='pause'){$('sub').textContent=tr('startedSub');$('go').textContent=tr('go')}
  });

  return {open,close,afterProfile:afterProfile2};
})();
