import { ValidatorRegistration } from '@/components/auctions/ValidatorRegistration'
import { useDashboardTitle } from '@/routes/_dashboard-layout'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard-layout/dashboard/auctions/register-validator')({
	component: RegisterValidatorComponent,
})

function RegisterValidatorComponent() {
	useDashboardTitle('Register as Validator')

	return (
		<div className="p-4 lg:p-8">
			<ValidatorRegistration />
		</div>
	)
}
