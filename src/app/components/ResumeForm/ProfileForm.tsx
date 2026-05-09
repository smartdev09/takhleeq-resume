import { SectionCard } from "components/ui/section-card";
import { CollapsibleSection } from "components/ui/collapsible-section";
import { Input, Textarea } from "components/ResumeForm/Form/InputGroup";
import { useSectionExpansion } from "components/ResumeForm/SectionExpansionContext";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { changeProfile, selectProfile } from "lib/redux/resumeSlice";
import { ResumeProfile } from "lib/redux/types";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

export const ProfileForm = () => {
  const expansion = useSectionExpansion();
  const isExpanded = expansion ? expansion.isExpanded("profile") : true;

  const profile = useAppSelector(selectProfile);
  const dispatch = useAppDispatch();
  const {
    firstName,
    lastName,
    title,
    email,
    phone,
    linkedin,
    website,
    city,
    state,
    country,
    summary,
  } = profile;

  const handleProfileChange = (field: keyof ResumeProfile, value: string) => {
    dispatch(changeProfile({ field, value }));
  };

  const actions = (
    <div className="shrink-0 rounded p-1 text-gray-500">
      <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
    </div>
  );

  return (
    <SectionCard className="p-3">
      <CollapsibleSection
        title="Contact Information"
        expanded={isExpanded}
        onToggle={() => expansion?.toggleSection("profile")}
        actions={actions}
        className="border-b-0"
      >
        <div className="grid grid-cols-6 gap-3">
          <Input
            label="First name"
            labelClassName="col-span-3"
            name="firstName"
            placeholder="John"
            value={firstName}
            onChange={handleProfileChange}
          />
          <Input
            label="Last name"
            labelClassName="col-span-3"
            name="lastName"
            placeholder="Doe"
            value={lastName}
            onChange={handleProfileChange}
          />
          <Input
            label="Target title"
            labelClassName="col-span-full"
            name="title"
            placeholder="Software Engineer"
            value={title}
            onChange={handleProfileChange}
          />
          <Textarea
            label="Professional summary"
            labelClassName="col-span-full"
            name="summary"
            placeholder="A brief summary of your experience and goals"
            value={summary}
            onChange={handleProfileChange}
          />
          <Input
            label="Email"
            labelClassName="col-span-4"
            name="email"
            placeholder="john@example.com"
            value={email}
            onChange={handleProfileChange}
          />
          <Input
            label="Phone"
            labelClassName="col-span-2"
            name="phone"
            placeholder="(123) 456-7890"
            value={phone}
            onChange={handleProfileChange}
          />
          <Input
            label="LinkedIn"
            labelClassName="col-span-4"
            name="linkedin"
            placeholder="linkedin.com/in/username"
            value={linkedin}
            onChange={handleProfileChange}
          />
          <Input
            label="Website"
            labelClassName="col-span-2"
            name="website"
            placeholder="yourwebsite.com"
            value={website}
            onChange={handleProfileChange}
          />
          <Input
            label="City"
            labelClassName="col-span-2"
            name="city"
            placeholder="San Francisco"
            value={city}
            onChange={handleProfileChange}
          />
          <Input
            label="State"
            labelClassName="col-span-2"
            name="state"
            placeholder="CA"
            value={state}
            onChange={handleProfileChange}
          />
          <Input
            label="Country"
            labelClassName="col-span-2"
            name="country"
            placeholder="United States"
            value={country ?? ""}
            onChange={handleProfileChange}
          />
        </div>
      </CollapsibleSection>
    </SectionCard>
  );
};
