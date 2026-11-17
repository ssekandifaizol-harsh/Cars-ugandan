import { Link } from 'react-router-dom'
import { LegalPage } from '../components/LegalPage'
import { useApp } from '../hooks/useApp'

export default function Privacy() {
  const { shop } = useApp()
  const name = shop?.name ?? 'Cars Uganda'
  const contact = [shop?.email, shop?.phone].filter(Boolean).join(' · ') || 'the contact details on our Contact page'
  return (
    <LegalPage title="Privacy Policy" intro={<p>{name} (“we”) runs this website and app. This policy explains what personal data we collect, why, who we share it with, and your rights under Uganda's <b>Data Protection and Privacy Act, 2019</b>.</p>}>
      <section><h2>1. Who is responsible</h2><p>{name}, {shop?.address ?? 'Kampala, Uganda'}, is the data controller. Contact us about your data at {contact}.</p></section>
      <section><h2>2. What we collect</h2><ul>
        <li><b>Account:</b> your name, email address, and (if you add them) phone number and location.</li>
        <li><b>Google sign-in:</b> if you use it, Google shares your name and email with us. We do not get your Google password.</li>
        <li><b>Enquiries:</b> the name, phone number and message you send about a car.</li>
        <li><b>Reviews and surveys:</b> your ratings and comments after buying a car.</li>
        <li><b>Saved cars and settings:</b> cars you save and your notification choices.</li>
        <li><b>Notifications:</b> a technical address for your device so we can send alerts. It does not identify you to anyone else.</li>
        <li><b>On your device:</b> we store settings like dark mode and saved cars in your browser. We do not use advertising or tracking cookies.</li>
      </ul></section>
      <section><h2>3. Why we use it</h2><ul>
        <li>To run your account and show your saved cars on any device.</li>
        <li>To reply to your enquiries by phone or WhatsApp.</li>
        <li>To tell you about new cars, only if you turn notifications on.</li>
        <li>To improve our service using surveys you choose to answer.</li>
        <li>To keep the platform secure and prevent spam and fraud.</li>
      </ul><p>We rely on your consent (which you can withdraw any time) and on what is needed to answer your requests.</p></section>
      <section><h2>4. Who we share it with</h2><p>We never sell your data. We use trusted service providers who process it for us:</p><ul>
        <li><b>Supabase</b> — database and login (servers in Ireland, EU).</li>
        <li><b>Cloudflare</b> — hosting the website.</li>
        <li><b>Google</b> — only if you choose “Continue with Google”.</li>
        <li><b>Your phone's push service</b> (Google, Apple or Mozilla) — to deliver notifications.</li>
        <li><b>WhatsApp</b> — only when you choose to message us there.</li>
      </ul><p>Some providers store data outside Uganda. We only use providers with strong data protection (the EU's GDPR standard or equivalent), as required by section 19 of the Act. We share data with authorities only when the law requires it.</p></section>
      <section><h2>5. Reviews</h2><p>Your survey answers are private. Your comment is shown publicly only if you tick the box allowing it, and only with the name you choose. Your phone number is never shown.</p></section>
      <section><h2>6. How long we keep it</h2><ul>
        <li>Account data: until you delete your account.</li>
        <li>Enquiries: up to 2 years, then deleted.</li>
        <li>Sales records: as long as Ugandan tax and business law requires.</li>
        <li>Deleted data may remain in encrypted backups for a few days before it is overwritten.</li>
      </ul></section>
      <section><h2>7. Your rights</h2><p>You can ask to see, correct or delete your personal data, and object to how we use it. You can do most of this yourself in <Link to="/account" className="text-accent underline">Account</Link>, including <b>deleting your account</b>. You can also complain to the <b>Personal Data Protection Office</b> (pdpo.go.ug).</p></section>
      <section><h2>8. Security</h2><p>Your data is encrypted in transit (HTTPS). Database rules make sure each person can only see their own data, and staff access is limited to the shop owner and admin.</p></section>
      <section><h2>9. Children</h2><p>This service is for people aged 18 and over. We do not knowingly collect data from children.</p></section>
      <section><h2>10. Changes</h2><p>If we change this policy, we will ask you to accept the new version the next time you sign in.</p></section>
    </LegalPage>
  )
}
