import client from './client'

const landingApi = {
  layNoiDungDaXuatBan: () => client.get('/landing'),
}

export default landingApi
