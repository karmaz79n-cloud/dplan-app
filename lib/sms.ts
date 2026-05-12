export async function sendSMS(to: string, text: string) {
  if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_FROM) return
  const toDigits = to.replace(/\D/g, '')
  if (!toDigits) return
  try {
    const { SolapiMessageService } = await import('solapi')
    const service = new SolapiMessageService(process.env.SOLAPI_API_KEY!, process.env.SOLAPI_API_SECRET!)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any).send({ to: toDigits, from: process.env.SOLAPI_FROM, text })
  } catch (e) {
    console.error('SMS 전송 실패:', e)
  }
}
