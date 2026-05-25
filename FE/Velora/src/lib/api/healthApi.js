import client from './client'
const healthApi = {
  kiemTra: () => client.get('/health'),
}
export default healthApi
