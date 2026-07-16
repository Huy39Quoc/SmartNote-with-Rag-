import client from './client'

const landingApi = {
  getPublishedContent: () => client.get('/landing'),
}

export default landingApi
