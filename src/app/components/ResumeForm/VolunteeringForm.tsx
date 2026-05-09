import { Form, FormSection } from "components/ResumeForm/Form";
import {
  Input,
  BulletListTextarea,
} from "components/ResumeForm/Form/InputGroup";
import type { CreateHandleChangeArgsWithDescriptions } from "components/ResumeForm/types";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import {
  changeVolunteering,
  selectVolunteering,
} from "lib/redux/resumeSlice";
import {
  changeShowBulletPoints,
  selectShowBulletPoints,
} from "lib/redux/settingsSlice";
import type { ResumeVolunteering } from "lib/redux/types";
import { BulletListIconButton } from "components/ResumeForm/Form/IconButton";

export const VolunteeringForm = () => {
  const volunteering = useAppSelector(selectVolunteering);
  const dispatch = useAppDispatch();
  const showDelete = volunteering.length > 1;
  const form = "volunteering";
  const showBulletPoints = useAppSelector(selectShowBulletPoints(form));

  return (
    <Form form={form} addButtonText="Add Volunteering">
      {volunteering.map(
        ({ organization, role, date, descriptions }, idx) => {
          const handleChange = (
            ...[field, value]: CreateHandleChangeArgsWithDescriptions<ResumeVolunteering>
          ) => {
            dispatch(changeVolunteering({ idx, field, value } as any));
          };
          const handleShowBulletPoints = (value: boolean) => {
            dispatch(changeShowBulletPoints({ field: form, value }));
          };
          const showMoveUp = idx !== 0;
          const showMoveDown = idx !== volunteering.length - 1;

          return (
            <FormSection
              key={idx}
              form={form}
              idx={idx}
              showMoveUp={showMoveUp}
              showMoveDown={showMoveDown}
              showDelete={showDelete}
              deleteButtonTooltipText="Delete volunteering"
            >
              <Input
                label="Organization"
                labelClassName="col-span-4"
                name="organization"
                placeholder="Local non-profit"
                value={organization}
                onChange={handleChange}
              />
              <Input
                label="Date"
                labelClassName="col-span-2"
                name="date"
                placeholder="2022 - Present"
                value={date}
                onChange={handleChange}
              />
              <Input
                label="Role"
                labelClassName="col-span-full"
                name="role"
                placeholder="Volunteer Coordinator"
                value={role}
                onChange={handleChange}
              />
              <div className="relative col-span-full">
                <BulletListTextarea
                  label="Description"
                  labelClassName="col-span-full"
                  name="descriptions"
                  placeholder="Bullet points"
                  value={descriptions}
                  onChange={handleChange}
                  showBulletPoints={showBulletPoints}
                />
                <div className="absolute left-[7.7rem] top-[0.07rem]">
                  <BulletListIconButton
                    showBulletPoints={showBulletPoints}
                    onClick={handleShowBulletPoints}
                  />
                </div>
              </div>
            </FormSection>
          );
        }
      )}
    </Form>
  );
};
