import { SolapiMessageService } from 'solapi'

const service = new SolapiMessageService(
  process.env.SOLAPI_API_KEY!,
  process.env.SOLAPI_API_SECRET!
)

export async function sendSMS(to: string, text: string) {
  const supabase = (await import('./supabase/server')).createClient
  const client = await supabase()
  const { data } = await client.from('app_settings').select('value').eq('key', 'sms_enabled').single()
  if (data?.value === 'false') return

  try {
    await service.sendOne({
      to,
      from: process.env.SOLAPI_FROM!,
      text,
    })
  } catch (e) {
    console.error('SMS 전송 실패:', e)
  }
}
