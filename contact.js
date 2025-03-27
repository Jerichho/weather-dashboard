document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const successMessage = document.getElementById('successMessage');

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };

        try {
            // Show loading state
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;

            // Send email using Email.js
            await emailjs.send(
                'YOUR_SERVICE_ID', // Replace with your Email.js service ID
                'YOUR_TEMPLATE_ID', // Replace with your Email.js template ID
                {
                    from_name: formData.name,
                    from_email: formData.email,
                    subject: formData.subject,
                    message: formData.message,
                    to_email: 'your-email@example.com' // Replace with your email
                },
                'YOUR_USER_ID' // Replace with your Email.js user ID
            );

            // Show success message
            contactForm.reset();
            contactForm.style.display = 'none';
            successMessage.style.display = 'block';

            // Reset form after 5 seconds
            setTimeout(() => {
                contactForm.style.display = 'block';
                successMessage.style.display = 'none';
            }, 5000);

        } catch (error) {
            console.error('Error sending email:', error);
            alert('Sorry, there was an error sending your message. Please try again later.');
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });

    // Add form validation
    const inputs = contactForm.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('invalid', (e) => {
            e.preventDefault();
            input.classList.add('error');
        });

        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                input.classList.remove('error');
            }
        });
    });
}); 