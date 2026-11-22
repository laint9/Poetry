/* Kho thơ mẫu dựng sẵn — các bài đã thuộc phạm vi công cộng (ca dao, thơ trung đại, tác giả mất trên 50 năm). */
(function (root) {
  var SEED = [
    { title: 'Truyện Kiều (đoạn mở đầu)', author: 'Nguyễn Du', form: 'lucbat', text:
'Trăm năm trong cõi người ta,\nChữ tài chữ mệnh khéo là ghét nhau.\nTrải qua một cuộc bể dâu,\nNhững điều trông thấy mà đau đớn lòng.\nLạ gì bỉ sắc tư phong,\nTrời xanh quen thói má hồng đánh ghen.\nCảo thơm lần giở trước đèn,\nPhong tình cổ lục còn truyền sử xanh.\nRằng năm Gia Tĩnh triều Minh,\nBốn phương phẳng lặng, hai kinh vững vàng.\nCó nhà viên ngoại họ Vương,\nGia tư nghĩ cũng thường thường bậc trung.\nMột trai con thứ rốt lòng,\nVương Quan là chữ, nối dòng nho gia.\nĐầu lòng hai ả tố nga,\nThúy Kiều là chị, em là Thúy Vân.\nMai cốt cách, tuyết tinh thần,\nMỗi người một vẻ, mười phân vẹn mười.\nVân xem trang trọng khác vời,\nKhuôn trăng đầy đặn, nét ngài nở nang.\nHoa cười ngọc thốt đoan trang,\nMây thua nước tóc, tuyết nhường màu da.\nKiều càng sắc sảo mặn mà,\nSo bề tài sắc lại là phần hơn.\nLàn thu thủy, nét xuân sơn,\nHoa ghen thua thắm, liễu hờn kém xanh.\nMột hai nghiêng nước nghiêng thành,\nSắc đành đòi một, tài đành họa hai.' },
    { title: 'Truyện Kiều (cảnh ngày xuân)', author: 'Nguyễn Du', form: 'lucbat', text:
'Ngày xuân con én đưa thoi,\nThiều quang chín chục đã ngoài sáu mươi.\nCỏ non xanh tận chân trời,\nCành lê trắng điểm một vài bông hoa.' },
    { title: 'Chinh phụ ngâm (đoạn mở đầu)', author: 'Đặng Trần Côn – Đoàn Thị Điểm dịch', form: 'stlb', text:
'Thuở trời đất nổi cơn gió bụi,\nKhách má hồng nhiều nỗi truân chuyên.\nXanh kia thăm thẳm tầng trên,\nVì ai gây dựng cho nên nỗi này.\nTrống Tràng Thành lung lay bóng nguyệt,\nKhói Cam Tuyền mờ mịt thức mây.\nChín tầng gươm báu trao tay,\nNửa đêm truyền hịch định ngày xuất chinh.' },
    { title: 'Bánh trôi nước', author: 'Hồ Xuân Hương', form: 'that_tu', text:
'Thân em vừa trắng lại vừa tròn,\nBảy nổi ba chìm với nước non.\nRắn nát mặc dầu tay kẻ nặn,\nMà em vẫn giữ tấm lòng son.' },
    { title: 'Tự tình II', author: 'Hồ Xuân Hương', form: 'that_bat', text:
'Đêm khuya văng vẳng trống canh dồn,\nTrơ cái hồng nhan với nước non.\nChén rượu hương đưa say lại tỉnh,\nVầng trăng bóng xế khuyết chưa tròn.\nXiên ngang mặt đất, rêu từng đám,\nĐâm toạc chân mây, đá mấy hòn.\nNgán nỗi xuân đi xuân lại lại,\nMảnh tình san sẻ tí con con.' },
    { title: 'Qua Đèo Ngang', author: 'Bà Huyện Thanh Quan', form: 'that_bat', text:
'Bước tới Đèo Ngang, bóng xế tà,\nCỏ cây chen đá, lá chen hoa.\nLom khom dưới núi, tiều vài chú,\nLác đác bên sông, chợ mấy nhà.\nNhớ nước đau lòng, con quốc quốc,\nThương nhà mỏi miệng, cái gia gia.\nDừng chân đứng lại, trời, non, nước,\nMột mảnh tình riêng, ta với ta.' },
    { title: 'Thu điếu', author: 'Nguyễn Khuyến', form: 'that_bat', text:
'Ao thu lạnh lẽo nước trong veo,\nMột chiếc thuyền câu bé tẻo teo.\nSóng biếc theo làn hơi gợn tí,\nLá vàng trước gió khẽ đưa vèo.\nTầng mây lơ lửng trời xanh ngắt,\nNgõ trúc quanh co khách vắng teo.\nTựa gối, buông cần lâu chẳng được,\nCá đâu đớp động dưới chân bèo.' },
    { title: 'Bạn đến chơi nhà', author: 'Nguyễn Khuyến', form: 'that_bat', text:
'Đã bấy lâu nay bác tới nhà,\nTrẻ thì đi vắng, chợ thì xa.\nAo sâu nước cả, khôn chài cá,\nVườn rộng rào thưa, khó đuổi gà.\nCải chửa ra cây, cà mới nụ,\nBầu vừa rụng rốn, mướp đương hoa.\nĐầu trò tiếp khách, trầu không có,\nBác đến chơi đây, ta với ta.' },
    { title: 'Đây thôn Vĩ Dạ', author: 'Hàn Mặc Tử', form: 'bay', text:
'Sao anh không về chơi thôn Vĩ?\nNhìn nắng hàng cau nắng mới lên.\nVườn ai mướt quá xanh như ngọc\nLá trúc che ngang mặt chữ điền.\n\nGió theo lối gió, mây đường mây,\nDòng nước buồn thiu, hoa bắp lay...\nThuyền ai đậu bến sông trăng đó,\nCó chở trăng về kịp tối nay?\n\nMơ khách đường xa, khách đường xa,\nÁo em trắng quá nhìn không ra...\nỞ đây sương khói mờ nhân ảnh,\nAi biết tình ai có đậm đà?' },
    { title: 'Tương tư (trích)', author: 'Nguyễn Bính', form: 'lucbat', text:
'Thôn Đoài ngồi nhớ thôn Đông,\nMột người chín nhớ mười mong một người.\nGió mưa là bệnh của giời,\nTương tư là bệnh của tôi yêu nàng.\nHai thôn chung lại một làng,\nCớ sao bên ấy chẳng sang bên này?\nNgày qua ngày lại qua ngày,\nLá xanh nhuộm đã thành cây lá vàng.' },
    { title: 'Trong đầm gì đẹp bằng sen', author: 'Ca dao', form: 'lucbat', text:
'Trong đầm gì đẹp bằng sen,\nLá xanh bông trắng lại chen nhị vàng.\nNhị vàng bông trắng lá xanh,\nGần bùn mà chẳng hôi tanh mùi bùn.' },
    { title: 'Công cha như núi Thái Sơn', author: 'Ca dao', form: 'lucbat', text:
'Công cha như núi Thái Sơn,\nNghĩa mẹ như nước trong nguồn chảy ra.\nMột lòng thờ mẹ kính cha,\nCho tròn chữ hiếu mới là đạo con.' },
    { title: 'Đường vô xứ Nghệ', author: 'Ca dao', form: 'lucbat', text:
'Đường vô xứ Nghệ quanh quanh,\nNon xanh nước biếc như tranh họa đồ.' },
    { title: 'Ví dầu cầu ván đóng đinh', author: 'Ca dao', form: 'lucbat', text:
'Ví dầu cầu ván đóng đinh,\nCầu tre lắt lẻo gập ghềnh khó đi.' },
    { title: 'Anh đi anh nhớ quê nhà', author: 'Ca dao', form: 'lucbat', text:
'Anh đi anh nhớ quê nhà,\nNhớ canh rau muống, nhớ cà dầm tương.\nNhớ ai dãi nắng dầm sương,\nNhớ ai tát nước bên đường hôm nao.' }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = SEED; else root.THIBUT_SEED = SEED;
})(this);
