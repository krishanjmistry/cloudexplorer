import { RoleDefinitionAssignedRow } from "../../types";

export const authRows: RoleDefinitionAssignedRow[] = [
  {
    id: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/providers/Microsoft.Authorization/RoleAssignments/3faba3f2-5e80-413a-8f2a-653906f5cb6e",
    roleDefinitionId:
      "/providers/Microsoft.Authorization/RoleDefinitions/8e3af657-a8ff-443c-a75c-2fe8c4bcb635",
    roleDefinitionName: "Owner",
    roleDefinitionDescription:
      "Grants full access to manage all resources, including the ability to assign roles in Azure RBAC.",
    principalId: "abcd0a7c-123b-456f-9xyz-c002def8c504",
    principalType: "User",
    scope: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095",
    createdOn: "2026-02-06T12:15:26.856Z",
  },
  {
    id: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/providers/Microsoft.Authorization/RoleAssignments/6b760008-651a-4e51-b349-897918ecba5e",
    roleDefinitionId:
      "/providers/Microsoft.Authorization/RoleDefinitions/8e3af657-a8ff-443c-a75c-2fe8c4bcb635",
    roleDefinitionName: "Owner",
    roleDefinitionDescription:
      "Grants full access to manage all resources, including the ability to assign roles in Azure RBAC.",
    principalId: "abcd0a7c-123b-456f-9xyz-c002def8c504",
    principalType: "User",
    scope: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095",
    createdOn: "2026-02-06T12:15:26.825Z",
  },
  {
    id: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/providers/Microsoft.Authorization/RoleAssignments/b2441b22-d179-47f4-87ea-0d6fd58a3b1f",
    roleDefinitionId:
      "/providers/Microsoft.Authorization/RoleDefinitions/acdd72a7-3385-48ef-bd42-f606fba81ae7",
    roleDefinitionName: "Reader",
    roleDefinitionDescription:
      "View all resources, but does not allow you to make any changes.",
    principalId: "1238b0aa-pqrs-45c1-9150-5xyza8d72fcf",
    principalType: "ServicePrincipal",
    scope: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095",
    createdOn: "2026-02-22T10:43:40.175Z",
  },
  {
    id: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/providers/Microsoft.Authorization/RoleAssignments/d84af49f-dd68-4a2f-a4fd-5413dcacec7b",
    roleDefinitionId:
      "/providers/Microsoft.Authorization/RoleDefinitions/acdd72a7-3385-48ef-bd42-f606fba81ae7",
    roleDefinitionName: "Reader",
    roleDefinitionDescription:
      "View all resources, but does not allow you to make any changes.",
    principalId: "971765d3-3aa5-4123-9e22-65cd0bbbda8x",
    principalType: "ServicePrincipal",
    scope: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095",
    createdOn: "2026-02-21T15:50:57.738Z",
  },
  {
    id: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/providers/Microsoft.Authorization/RoleAssignments/f4edc0e2-c9e8-5a1b-9471-081ebb9d71e9",
    roleDefinitionId:
      "/providers/Microsoft.Authorization/RoleDefinitions/8e3af657-a8ff-443c-a75c-2fe8c4bcb635",
    roleDefinitionName: "Owner",
    roleDefinitionDescription:
      "Grants full access to manage all resources, including the ability to assign roles in Azure RBAC.",
    principalId: "1234d2bc-abcd-4511-abf6-4a7543266acd",
    principalType: "ServicePrincipal",
    scope: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095",
    createdOn: "2026-02-06T15:47:10.127Z",
  },
  {
    id: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourceGroups/rg-uabcd12-0/providers/Microsoft.KeyVault/vaults/kv-uabcd12/providers/Microsoft.Authorization/RoleAssignments/119b6908-c603-4616-a6a1-8bcd41a3e30c",
    roleDefinitionId:
      "/providers/Microsoft.Authorization/RoleDefinitions/21090545-7ca7-4776-b22c-e363652d74d2",
    roleDefinitionName: "Key Vault Reader",
    roleDefinitionDescription:
      "Read metadata of key vaults and its certificates, keys, and secrets. Cannot read sensitive values such as secret contents or key material. Only works for key vaults that use the 'Azure role-based access control' permission model.",
    principalId: "5a908450-60xx-4c5y-9a26-4z95d163pqr5",
    principalType: "ServicePrincipal",
    scope:
      "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourceGroups/rg-uabcd12-0/providers/Microsoft.KeyVault/vaults/kv-uabcd12",
    createdOn: "2026-02-07T15:56:19.219Z",
  },
  {
    id: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourcegroups/rg-uabcd12-0/providers/Microsoft.KeyVault/vaults/kv-uabcd12/providers/Microsoft.Authorization/RoleAssignments/5402f102-e8e9-51e4-b867-d5b327eae4f5",
    roleDefinitionId:
      "/providers/Microsoft.Authorization/RoleDefinitions/b86a8fe4-44ce-4948-aee5-eccb2c155cd7",
    roleDefinitionName: "Key Vault Secrets Officer",
    roleDefinitionDescription:
      "Perform any action on the secrets of a key vault, except manage permissions. Only works for key vaults that use the 'Azure role-based access control' permission model.",
    principalId: "52klm79d-9804-4123-b704-d2e568f2pqr9",
    principalType: "ServicePrincipal",
    scope:
      "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourcegroups/rg-uabcd12-0/providers/Microsoft.KeyVault/vaults/kv-uabcd12",
    createdOn: "2026-02-06T15:39:04.594Z",
  },
  {
    id: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourceGroups/rg-uabcd12-0/providers/Microsoft.KeyVault/vaults/kv-uabcd12/providers/Microsoft.Authorization/RoleAssignments/c6258c94-d80b-4247-a585-f5b0a32e1614",
    roleDefinitionId:
      "/providers/Microsoft.Authorization/RoleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c",
    roleDefinitionName: "Contributor",
    roleDefinitionDescription:
      "Grants full access to manage all resources, but does not allow you to assign roles in Azure RBAC, manage assignments in Azure Blueprints, or share image galleries.",
    principalId: "abcd0a7c-123b-456f-9xyz-c002def8c504",
    principalType: "User",
    scope:
      "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourceGroups/rg-uabcd12-0/providers/Microsoft.KeyVault/vaults/kv-uabcd12",
    createdOn: "2026-02-10T19:56:39.925Z",
  },
  {
    id: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourcegroups/rg-uabcd12-0/providers/Microsoft.KeyVault/vaults/kv-uabcd12/providers/Microsoft.Authorization/RoleAssignments/cba063e0-f6d6-523e-8f30-18d9493b7d27",
    roleDefinitionId:
      "/providers/Microsoft.Authorization/RoleDefinitions/b86a8fe4-44ce-4948-aee5-eccb2c155cd7",
    roleDefinitionName: "Key Vault Secrets Officer",
    roleDefinitionDescription:
      "Perform any action on the secrets of a key vault, except manage permissions. Only works for key vaults that use the 'Azure role-based access control' permission model.",
    principalId: "07e41234-1941-4207-pqr1-3d5158amnq70",
    principalType: "ServicePrincipal",
    scope:
      "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourcegroups/rg-uabcd12-0/providers/Microsoft.KeyVault/vaults/kv-uabcd12",
    createdOn: "2026-02-06T15:39:04.489Z",
  },
  {
    id: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourcegroups/rg-uabcd12-0/providers/Microsoft.Storage/storageAccounts/stauabcd12/providers/Microsoft.Authorization/RoleAssignments/166e73ed-1659-5ad5-96d5-abc2969b29c8",
    roleDefinitionId:
      "/providers/Microsoft.Authorization/RoleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe",
    roleDefinitionName: "Storage Blob Data Contributor",
    roleDefinitionDescription:
      "Allows for read, write and delete access to Azure Storage blob containers and data",
    principalId: "52klm79d-9804-4123-b704-d2e568f2pqr9",
    principalType: "ServicePrincipal",
    scope:
      "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourcegroups/rg-uabcd12-0/providers/Microsoft.Storage/storageAccounts/stauabcd12",
    createdOn: "2026-02-06T15:39:06.621Z",
  },
  {
    id: "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourcegroups/rg-uabcd12-0/providers/Microsoft.Storage/storageAccounts/stauabcd12/providers/Microsoft.Authorization/RoleAssignments/935d7358-ba30-52e6-8b27-6719bf7cf467",
    roleDefinitionId:
      "/providers/Microsoft.Authorization/RoleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe",
    roleDefinitionName: "Storage Blob Data Contributor",
    roleDefinitionDescription:
      "Allows for read, write and delete access to Azure Storage blob containers and data",
    principalId: "07e41234-1941-4207-pqr1-3d5158amnq70",
    principalType: "ServicePrincipal",
    scope:
      "/subscriptions/215abcdf-e871-479a-9d1c-17fpqr915095/resourcegroups/rg-uabcd12-0/providers/Microsoft.Storage/storageAccounts/stauabcd12",
    createdOn: "2026-02-06T15:39:06.659Z",
  },
];
