import { Link } from 'react-router-dom'
import { LegalPage } from '../components/LegalPage'
import { useApp } from '../hooks/useApp'

export default function Terms() {
  const { shop } = useApp()
  const name = shop?.name ?? 'Cars Uganda'
  return (
    <LegalPage title="Terms of Use" intro={<p>By creating an account or using {name}, you agree to these terms. Please read them with our <Link to="/privacy" className="text-accent underline">Privacy Policy</Link>.</p>}>
      <section><h2>1. What this platform is</h2><p>{name} shows cars available at our showroom. The website is an advertisement and a way to contact us. <b>No sale happens on the website</b>: every purchase is agreed and paid in person, with a written sale agreement.</p></section>
      <section><h2>2. Car information and prices</h2><ul>
        <li>We work hard to keep details, photos and prices accurate, but mistakes can happen and prices can change without notice.</li>
        <li>Always inspect the car, take a test drive, and check its documents (logbook, URA clearance, any loans on the car) before paying.</li>
        <li>A car shown as “Available” may already be reserved. Please confirm with us.</li>
      </ul></section>
      <section><h2>3. Your account</h2><ul>
        <li>You must be 18 or older and give true information.</li>
        <li>Keep your password private. You are responsible for activity on your account.</li>
        <li>You can delete your account at any time from the Account page.</li>
      </ul></section>
      <section><h2>4. Fair use</h2><p>Do not misuse the platform. This includes sending spam or fake enquiries, trying to break into accounts or the system, copying our listings or photos for other sites, or posting insulting or false reviews. We may suspend accounts that do this.</p></section>
      <section><h2>5. Reviews</h2><p>Only verified buyers can review. By allowing your review to be published, you give us permission to show it on our website. We may decline to publish a review or remove one.</p></section>
      <section><h2>6. Notifications</h2><p>Notifications are optional. You can turn them, or their sound, off at any time in Account settings or in your phone's settings.</p></section>
      <section><h2>7. Our content</h2><p>Photos, text and the design of this platform belong to {name} or its licensors. See <Link to="/licenses" className="text-accent underline">Licenses</Link> for open-source software we use.</p></section>
      <section><h2>8. Liability</h2><p>The website is provided “as is”. To the extent the law allows, we are not responsible for losses caused by relying on website information without inspecting the car, or by the website being temporarily unavailable. Nothing here limits your rights under Ugandan consumer law.</p></section>
      <section><h2>9. Law</h2><p>These terms are governed by the laws of Uganda. Disputes go to the courts of Uganda.</p></section>
      <section><h2>10. Changes</h2><p>If we change these terms, we will ask you to accept the new version the next time you sign in.</p></section>
    </LegalPage>
  )
}
