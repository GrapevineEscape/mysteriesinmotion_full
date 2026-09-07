import { HOST_TESTIMONIALS } from "@/lib/live-event-facts";

export function HostTestimonials() {
  return (
    <section className="section testimonials-section">
      <div className="section-heading">
        <p className="eyebrow">From recent hosts</p>
        <h2>What event planners tell us.</h2>
      </div>
      <div className="testimonial-grid">
        {HOST_TESTIMONIALS.map((item) => (
          <blockquote className="testimonial-card" key={item.attribution}>
            <p>“{item.quote}”</p>
            <footer>{item.attribution}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
