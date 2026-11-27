const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const sandbox = { Date, Map, Set };
vm.createContext(sandbox);
vm.runInContext(html.match(/<script id="inventory-core">([\s\S]*?)<\/script>/)[1], sandbox);
const I = sandbox.Inventory;
const product = (id, initialStock = 0) => ({ id, name: id, initialStock, initialDate: '2026-11-01', active: true });
const tx = (id, date, type, productId, quantity) => ({ id, date, type, items: [{ productId, quantity }], note: '' });
const fixture = () => ({ version: 1, products: [product('Tiger'), product('Heineken', 3)], transactions: [tx('a', '2026-11-12', 'in', 'Tiger', 10), { id: 'b', date: '2026-11-13', type: 'out', items: [{ productId: 'Tiger', quantity: 5 }, { productId: 'Heineken', quantity: 3 }], note: '' }, tx('c', '2026-11-15', 'in', 'Tiger', 14)] });

test('Ví dụ thực tế: tồn Tiger 10 → 5 → 19, Heineken 0; thống kê đúng ngày', () => {
  const data = I.validate(fixture());
  assert.equal(I.snapshot(data, '2026-11-12').products[0].stock, 10);
  const day13 = I.snapshot(data, '2026-11-13');
  assert.equal(day13.products[0].stock, 5);
  assert.equal(day13.products[1].stock, 0);
  assert.equal(day13.outgoing, 8);
  assert.equal(I.snapshot(data, '2026-11-15').total, 19);
  assert.equal(I.snapshot(data, '2026-11-15').incoming, 14);
});
test('Chặn xuất vượt tồn, kể cả xuất lùi ngày trước phiếu nhập', () => {
  const data = fixture();
  data.transactions.push(tx('d', '2026-11-14', 'out', 'Tiger', 6));
  assert.throws(() => I.validate(data), /Tiger thiếu 1/);
  data.transactions.pop();
  data.transactions.push(tx('e', '2026-11-11', 'out', 'Tiger', 1));
  assert.throws(() => I.validate(data), /2026-11-11/);
});
test('Chặn sửa/xóa phiếu nhập cũ làm tồn âm về sau; xóa xuất tính lại đúng', () => {
  const data = fixture();
  data.transactions[0].items[0].quantity = 4;
  assert.throws(() => I.validate(data), /thiếu 1/);
  data.transactions.shift();
  assert.throws(() => I.validate(data), /thiếu 5/);
  const other = fixture();
  other.transactions.splice(1, 1);
  assert.equal(I.snapshot(I.validate(other), '2026-11-15').total, 27);
});
test('Một phiếu nhiều loại được kiểm tra toàn bộ; cấm trùng loại trong cùng phiếu', () => {
  const data = fixture();
  data.transactions[1].items[1].quantity = 4;
  assert.throws(() => I.validate(data), /Heineken thiếu 1/);
  assert.equal(fixture().transactions[1].items[1].quantity, 3);
  data.transactions[1].items[1] = { productId: 'Tiger', quantity: 1 };
  assert.throws(() => I.validate(data), /bị trùng/);
});
test('Tồn đầu kỳ có ngày hiệu lực; cấm giao dịch trước ngày bắt đầu', () => {
  const data = I.validate(fixture());
  assert.equal(I.snapshot(data, '2026-10-31').total, 0);
  assert.equal(I.snapshot(data, '2026-11-01').total, 3);
  data.products[0].initialDate = '2026-11-13';
  assert.throws(() => I.validate(data), /đứng trước/);
});
test('Cùng ngày nhập trước xuất, bất kể thứ tự lưu phiếu; phiếu tương lai không tính sớm', () => {
  const data = { version: 1, products: [product('Tiger')], transactions: [tx('out', '2026-11-12', 'out', 'Tiger', 5), tx('in', '2026-11-12', 'in', 'Tiger', 10)] };
  assert.equal(I.snapshot(I.validate(data), '2026-11-12').total, 5);
  assert.equal(I.snapshot(data, '2026-11-11').total, 0);
});
test('Loại ngừng dùng vẫn giữ lịch sử và tồn kho', () => {
  const data = fixture(); data.products[0].active = false;
  assert.equal(I.snapshot(I.validate(data), '2026-11-15').total, 19);
});
test('Lọc khoảng ngày, loại bia và hình thức; CSV xuất đúng các dòng đã lọc', () => {
  const data = I.validate(fixture());
  const filters = { from: '2026-11-13', to: '2026-11-13', type: 'out', productId: 'Tiger' };
  assert.equal(I.filterTransactions(data, filters).length, 1);
  const csv = I.csv(data, filters);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.equal(csv.split('\r\n').length, 2);
  assert.ok(csv.includes('"Tiger","0","5"'));
  assert.ok(!csv.includes('Heineken'));
});
test('CSV bảo toàn dấu tiếng Việt, dấu nháy, xuống dòng và chặn công thức', () => {
  const data = fixture(); data.transactions[0].note = '=HYPERLINK("bad")\nGhi chú';
  const csv = I.csv(I.validate(data));
  assert.ok(csv.includes("\"'=HYPERLINK(\"\"bad\"\")\nGhi chú\""));
});
test('Khôi phục JSON round trip; dữ liệu lạ không được giữ lại', () => {
  const data = fixture(); data.secret = 'extra';
  const clean = I.validate(JSON.parse(JSON.stringify(data)));
  assert.equal(clean.secret, undefined);
  assert.equal(JSON.stringify(clean), JSON.stringify(I.validate(fixture())));
});
test('Từ chối dữ liệu sai định dạng, ngày sai, mã trùng, số âm/lẻ và tràn số', () => {
  for (const value of [null, {}, { version: 99, products: [], transactions: [] }]) assert.throws(() => I.validate(value));
  for (const value of [-1, 0, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const data = fixture(); data.transactions[0].items[0].quantity = value;
    assert.throws(() => I.validate(data));
  }
  assert.equal(I.dateValid('2026-02-30'), false);
  assert.equal(I.dateValid('2024-02-29'), true);
  const data = fixture(); data.products.push(product('Tiger'));
  assert.throws(() => I.validate(data), /bị trùng/);
  const overflow = { version: 1, products: [product('A', Number.MAX_SAFE_INTEGER), product('B', 1)], transactions: [] };
  assert.throws(() => I.validate(overflow), /giới hạn/);
});
test('Đổi tồn đầu kỳ cũng phải kiểm tra toàn bộ lịch sử', () => {
  const data = fixture(); data.products[1].initialStock = 2;
  assert.throws(() => I.validate(data), /Heineken thiếu 1/);
});
test('Tồn gần giới hạn an toàn không phụ thuộc thứ tự lưu phiếu', () => {
  const max = Math.floor(Number.MAX_SAFE_INTEGER / 24);
  const data = { version: 1, products: [product('Tiger', max)], transactions: [tx('in', '2026-11-03', 'in', 'Tiger', max), tx('out', '2026-11-02', 'out', 'Tiger', max)] };
  assert.equal(I.snapshot(I.validate(data), '2026-11-03').total, max);
});
test('Chuyển dữ liệu v1 sang v2 một lần, giữ nguyên tồn và phiếu cũ', () => {
  const migrated = I.validate(fixture());
  assert.equal(migrated.version, 2);
  assert.equal(migrated.transactions[0].items[0].unit, 'case');
  assert.equal(migrated.transactions[0].operator, '');
  assert.equal(migrated.reviews.length, 0);
  assert.equal(I.snapshot(migrated, '2026-11-15').totalCans, 19 * 24);
  assert.equal(JSON.stringify(migrated), JSON.stringify(I.validate(migrated)));
});
function cansFixture() {
  return { version: 2, products: [product('Tiger', 1)], transactions: [{ ...tx('loose', '2026-11-12', 'out', 'Tiger', 10), operator: 'Minh', items: [{ productId: 'Tiger', quantity: 10, unit: 'can' }] }], reviews: [] };
}
test('Xuất 10 lon từ 1 thùng còn đúng 14 lon, không có sai số', () => {
  const data = I.validate(cansFixture());
  assert.equal(I.snapshot(data, '2026-11-12').totalCans, 14);
  assert.equal(I.quantityText(14), '14 lon');
  assert.equal(I.quantityText(38), '1 thùng 14 lon');
  assert.equal(I.quantityText(0), '0 thùng');
});
test('Xuất từng lon 24 lần hết chính xác 1 thùng; lon thứ 25 bị chặn', () => {
  const data = cansFixture();
  data.transactions = Array.from({ length: 24 }, (_, n) => ({ ...data.transactions[0], id: 'can-' + n, items: [{ productId: 'Tiger', quantity: 1, unit: 'can' }] }));
  assert.equal(I.snapshot(I.validate(data), '2026-11-12').totalCans, 0);
  data.transactions.push({ ...data.transactions[0], id: 'too-many' });
  assert.throws(() => I.validate(data), /thiếu 1 lon/);
});
test('Sửa/xóa phiếu có lon vẫn kiểm tra tồn tất cả ngày', () => {
  const data = cansFixture();
  data.transactions[0].items[0].quantity = 25;
  assert.throws(() => I.validate(data), /thiếu 1 lon/);
  data.transactions.push({ ...data.transactions[0], id: 'later-in', date: '2026-11-13', type: 'in', items: [{ productId: 'Tiger', quantity: 1, unit: 'case' }] });
  assert.throws(() => I.validate(data), /2026-11-12/);
  data.transactions[0].items[0].quantity = 10;
  data.products[0].initialStock = 0;
  assert.throws(() => I.validate(data), /thiếu 10 lon/);
});
test('Lũy kế tháng từ ngày 1 đến ngày chọn, không tính đầu kỳ, tháng trước hoặc ngày sau', () => {
  const data = cansFixture(); data.products[0].initialStock = 10; data.products[0].initialDate = '2026-10-01';
  data.transactions.push({ ...data.transactions[0], id: 'prior', date: '2026-10-31', type: 'in', items: [{ productId: 'Tiger', quantity: 2, unit: 'case' }] });
  data.transactions.push({ ...data.transactions[0], id: 'month-in', date: '2026-11-01', type: 'in', items: [{ productId: 'Tiger', quantity: 3, unit: 'case' }] });
  data.transactions.push({ ...data.transactions[0], id: 'after', date: '2026-11-16', type: 'in', items: [{ productId: 'Tiger', quantity: 9, unit: 'case' }] });
  const month = I.periodTotals(I.validate(data), '2026-11-01', '2026-11-15');
  assert.equal(month.incomingCans, 72); assert.equal(month.outgoingCans, 10);
  assert.equal(month.transactions.length, 2);
});
function reviewedFixture() {
  const data = I.validate(cansFixture());
  data.reviews.push({ id: 'review', from: '2026-11-11', to: '2026-11-12', reviewer: 'Quản lý Hương', confirmedAt: '2026-11-13T12:00:00.000Z', snapshot: I.reviewSnapshot(data, '2026-11-11', '2026-11-12') });
  return data;
}
test('Xác nhận nhiều ngày ghi tên quản lý; giữ qua sao lưu/khôi phục', () => {
  const data = I.validate(JSON.parse(JSON.stringify(reviewedFixture())));
  const statuses = I.reviewStatuses(data);
  assert.equal(statuses[0].valid, true);
  assert.equal(I.reviewFor(data.transactions[0], statuses).reviewer, 'Quản lý Hương');
});
test('Sửa số lượng, đơn vị, tên người, ghi chú, tên bia hoặc xóa phiếu làm mốc cần xem lại', () => {
  const changes = [d => d.transactions[0].items[0].quantity++, d => { d.transactions[0].items[0].unit = 'case'; d.products[0].initialStock = 100; }, d => d.transactions[0].operator = 'Người khác', d => d.transactions[0].note = 'Sửa ghi chú', d => d.products[0].name = 'Tiger Crystal', d => d.transactions.splice(0)];
  for (const change of changes) {
    const data = reviewedFixture(); change(data);
    assert.equal(I.reviewStatuses(I.validate(data))[0].valid, false);
  }
});
test('Bổ sung phiếu lùi ngày làm mất hiệu lực mốc; phiếu ngoài khoảng không ảnh hưởng', () => {
  const data = reviewedFixture();
  data.transactions.push({ ...data.transactions[0], id: 'new', date: '2026-11-11', type: 'in' });
  assert.equal(I.reviewStatuses(I.validate(data))[0].valid, false);
  data.transactions[1].date = '2026-11-13';
  assert.equal(I.reviewStatuses(I.validate(data))[0].valid, true);
});
test('CSV ghi đúng số lượng, đơn vị lon, người thực hiện và quản lý xác nhận', () => {
  const csv = I.csv(reviewedFixture());
  assert.ok(csv.includes('"Tiger","0","10"'));
  assert.ok(csv.includes('"lon","Minh","10","Quản lý Hương"'));
});
test('Từ chối đơn vị lạ, tên quá dài và mốc xác nhận sai', () => {
  const data = cansFixture(); data.transactions[0].items[0].unit = 'bottle';
  assert.throws(() => I.validate(data), /Đơn vị/);
  const other = cansFixture(); other.transactions[0].operator = 'x'.repeat(81);
  assert.throws(() => I.validate(other), /Tên người/);
  const review = reviewedFixture(); review.reviews[0].from = '2026-11-14';
  assert.throws(() => I.validate(review), /Mốc xác nhận/);
});
