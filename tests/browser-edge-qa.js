// Chỉ chạy trên origin kiểm thử riêng; xóa dữ liệu sau khi hoàn thành.
async (page) => {
  const checks = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (value, name) => { if (!value) throw new Error(name); checks.push(name); };
  const key = 'kho-bia.data.v1';
  const seed = { version: 1, products: [{ id: 'tiger', name: 'Tiger', initialStock: 10, initialDate: '2026-11-01', active: true }], transactions: [{ id: 'receipt', date: '2026-11-15', type: 'in', items: [{ productId: 'tiger', quantity: 5 }], note: 'Phiếu gốc' }] };
  await page.goto('http://127.0.0.1:8765');
  await page.evaluate(data => localStorage.setItem('kho-bia.data.v1', JSON.stringify(data)), seed); await page.reload();
  await page.locator('[data-page=history]').click();
  await page.locator('[data-edit-transaction=receipt]').click();
  await page.locator('.item-quantity').fill('8');
  const other = await page.context().newPage();
  await other.goto('http://127.0.0.1:8765');
  await other.locator('[data-page=history]').click();
  await other.locator('[data-edit-transaction=receipt]').click();
  await other.locator('.item-quantity').fill('6');
  await other.locator('#save-transaction').click();
  await page.locator('#total-stock').filter({ hasText: '16' }).waitFor();
  check(await page.locator('.item-quantity').inputValue() === '8', 'Tab khác cập nhật mà giữ phiếu nháp');
  await page.locator('#save-transaction').click();
  check((await page.locator('#transaction-error').textContent()).includes('tab khác'), 'Chặn phiếu sửa cũ ghi đè phiếu đã đổi ở tab khác');
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('kho-bia.data.v1')).transactions[0].items[0].quantity) === 6, 'Giao dịch mới nhất vẫn giữ nguyên');
  await other.close();

  // Khi storage event chưa đến, persist cũng phải so sánh dữ liệu mới nhất.
  await page.reload();
  await page.locator('.item-product').selectOption('tiger');
  await page.locator('.item-quantity').fill('1');
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('kho-bia.data.v1'));
    data.products[0].name = 'Tiger mới';
    localStorage.setItem('kho-bia.data.v1', JSON.stringify(data));
  });
  await page.locator('#save-transaction').click();
  check((await page.locator('#transaction-error').textContent()).includes('Dữ liệu đã thay đổi'), 'So sánh bản lưu trước khi ghi, kể cả chưa nhận storage event');
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('kho-bia.data.v1')).transactions.length) === 1, 'Xung đột không ghi thêm phiếu');

  const future = { ...seed, transactions: [...seed.transactions, { id: 'future', date: '2099-12-31', type: 'in', items: [{ productId: 'tiger', quantity: 7 }], note: '<img src=x onerror=alert(1)>' }] };
  await page.evaluate(data => localStorage.setItem('kho-bia.data.v1', JSON.stringify(data)), future); await page.reload();
  check((await page.locator('#total-stock').textContent()).trim() === '15 thùng', 'Phiếu tương lai chưa cộng vào tồn hiện tại');
  await page.locator('#snapshot-date').fill('2099-12-31'); await page.locator('#snapshot-date').dispatchEvent('change');
  check((await page.locator('#total-stock').textContent()).trim() === '22 thùng', 'Xem tồn tương lai tính đúng phiếu tương lai');
  await page.locator('[data-page=history]').click();
  check(await page.locator('#history-list img').count() === 0 && (await page.locator('#history-list').textContent()).includes('<img src=x'), 'Ghi chú HTML hiển thị dạng văn bản');
  await page.locator('#filter-from').fill('2026-11-20');
  await page.locator('#filter-to').fill('2026-11-01'); await page.locator('#filter-to').dispatchEvent('change');
  check(await page.locator('#filter-error').isVisible(), 'Cảnh báo khoảng ngày đảo ngược');

  const denied = await page.context().newPage();
  await denied.addInitScript(() => { Storage.prototype.getItem = function() { throw new DOMException('Denied', 'SecurityError'); }; });
  await denied.goto('http://127.0.0.1:8765');
  check(await denied.locator('#storage-warning').isVisible() && await denied.locator('#save-transaction').isDisabled(), 'LocalStorage bị chặn được thông báo và khóa lưu');
  await denied.close();

  // Nhiều dòng: phân trang ở lịch sử không làm thay đổi dữ liệu gốc.
  const many = { ...seed, transactions: Array.from({ length: 35 }, (_, n) => ({ id: 'receipt-' + n, date: '2026-11-15', type: 'in', items: [{ productId: 'tiger', quantity: 1 }], note: 'Phiếu ' + n })) };
  await page.evaluate(data => localStorage.setItem('kho-bia.data.v1', JSON.stringify(data)), many); await page.reload();
  await page.locator('[data-page=history]').click();
  check(await page.locator('#history-list tbody tr').count() === 30, 'Lịch sử giới hạn 30 dòng mỗi trang');
  await page.locator('[data-history-next]').click();
  check(await page.locator('#history-list tbody tr').count() === 5, 'Trang hai có đúng 5 dòng còn lại');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.locator('[data-page=backup]').click();
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Màn hình 320px sử dụng được mục sao lưu');
  await page.locator('[data-page=overview]').click();
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Màn hình 320px sử dụng được tổng quan');
  check(errors.length === 0, 'Không có lỗi JavaScript ở các tình huống biên');
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  return { passed: checks.length, checks };
}
