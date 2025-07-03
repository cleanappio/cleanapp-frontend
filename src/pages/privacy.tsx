import React from "react";

const privacy = () => {
  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col gap-4 md:gap-8">
      <h4 className="text-2xl font-bold">Privacy Policy (June 13, 2023)</h4>
      <p>
        This Privacy Policy describes how our company collects, uses, and shares
        your personal information when you visit our website or use our
        services. We are committed to protecting your privacy and ensuring the
        security of your personal information. By using our application, you
        consent to the practices described in this Privacy Policy.
      </p>
      <h5 className="text-xl font-bold">Information We Collect</h5>
      <p>
        1.1 Personal Information: We may collect personal information such as
        your avatar name and a blockchain address when you register in our app.
        Your avatar name and a blockchain address are securely stored on your
        device and are sent within your reports to process rewards.
      </p>
      <p>
        1.2 Usage Data: Our app collects information about your location when
        you use the application, i.e. take a litter or hazard report.{" "}
      </p>
      <h5 className="text-xl font-bold">Use of Information</h5>
      <p>
        2.1 Personal Information: We use your blockchain address to process game
        rewards. We send points you won to your blockchain address once a day.
        After that we remove your avatar and &nbsp;blockchain address from your
        reports and your reports become anonymized. If you consent to publish
        reports with your avatar, we will keep your avatar connected to reports.
      </p>
      <p>
        2.2 Usage Data: We use anonymized location data to aggregate report data
        by certain locations and send alerts to remediators for taking action on
        your reports.
      </p>
      <h5 className="text-xl font-bold">Information Sharing</h5>
      <p>
        3.1 Data Publishing: We may publish your reports with your avatar only
        if you consent. Otherwise all reports are published anonymously.
      </p>
      <p>
        3.2 Third-Party Service Providers: We may share your personal
        information with trusted third-party service providers who assist us in
        operating our website, conducting our business, or providing services to
        you. These service providers have access to your personal information
        only to perform tasks on our behalf and are obligated not to disclose or
        use it for any other purpose.
      </p>
      <p>
        3.3 Legal Compliance: We may disclose your personal information if
        required by law or in response to valid requests by public authorities
        (e.g., a court or government agency).
      </p>
      <h5 className="text-xl font-bold">Data Security</h5>
      <p>
        We implement reasonable security measures to protect your personal
        information from unauthorized access, disclosure, alteration, or
        destruction. However, please note that no method of transmission over
        the internet or electronic storage is 100% secure, and we cannot
        guarantee absolute security.
      </p>
      <h5 className="text-xl font-bold">Your Choices</h5>
      <p>
        You have the right to access, correct, or delete your personal
        information. You can also choose to unsubscribe from our marketing
        communications or adjust your preferences by contacting us at
        privacy@cleanapp.io.
      </p>
      <h5 className="text-xl font-bold">Updates to this Privacy Policy</h5>
      <p>
        We may update this Privacy Policy from time to time to reflect changes
        in our practices or applicable laws. We will notify you of any
        significant changes by posting the updated Privacy Policy on our website
        or by other means of communication.
      </p>
      <h5 className="text-xl font-bold">Contact Us</h5>
      <p>
        If you have any questions, concerns, or requests regarding this Privacy
        Policy or the handling of your personal information, please contact us
        at <span className="text-blue-500">privacy@cleanapp.io.</span>
      </p>
    </div>
  );
};

export default privacy;
