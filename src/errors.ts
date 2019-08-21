export function err(error: ERROR, s?: any) {
  let msg = errors[error] || "Unknown error";
  return Error(msg.replace("%s", s));
}

export const enum ERROR {
  ActivationContext_InvalidPath,
  Application_Inactive,
  ViewActivity_ViewBound,
  ViewActivity_NoRenderContext,
  ViewActivity_NoApplication,
  ViewActivity_NoDialogBuilder,
  ViewComponent_InvalidChild,
  ViewComponent_NoRenderCtx,
  Binding_UnknownFilter,
  Binding_NotABinding,
  Binding_NotFound,
  Binding_ParentNotFound,
  Binding_NoComponent,
  Binding_ObjectType,
  Component_NotAHandler,
  Component_InvalidEventHandler,
  List_Symbol,
  List_Type,
  List_Destroyed,
  List_Duplicate,
  List_NotFound,
  List_OutOfBounds,
  Map_Type,
  Map_Destroyed,
  Object_Base,
  Object_NotEvent,
  Object_Recursion,
  Object_CannotDeactivate,
  Object_Destroyed,
  Object_StateCancelled,
  Object_InvalidRef,
  Object_RefDestroyed,
  Object_PropNotManaged,
  Object_PropGetSet,
  Object_NotWritable,
  Object_InvalidDep,
  Record_Validation,
  Record_Destroyed,
  Ref_Type,
  Service_NoName,
  Service_BlankName,
  Observe_ObservedType,
  Observe_ObserveParent,
  Observe_ShadowGetter,
  Observe_RateLimitNonAsync,
  Observe_ObserverRecursion,
  Util_NoSync,
  Util_AlreadyManaged,
  UIStyle_Invalid,
  UIMenu_NoBuilder,
  UIModalController_Binding,
}

const errors: { [error: number]: string } = {
  [ERROR.ActivationContext_InvalidPath]: "[ActivationContext] Invalid path: %s",
  [ERROR.Application_Inactive]:
    "[Application] Cannot add activities to inactive application",
  [ERROR.ViewActivity_ViewBound]: "[ViewActivity] View property cannot be bound",
  [ERROR.ViewActivity_NoRenderContext]:
    "[ViewActivity] Render context not found (not a child component?)",
  [ERROR.ViewActivity_NoApplication]: "[ViewActivity] Application instance not found",
  [ERROR.ViewActivity_NoDialogBuilder]: "[ViewActivity] Dialog builder not found",
  [ERROR.ViewComponent_InvalidChild]: "Invalid ViewComponent child component",
  [ERROR.ViewComponent_NoRenderCtx]:
    "[ViewComponent] Render context not found (not a child component?)",
  [ERROR.Binding_UnknownFilter]: "[Binding] Unknown binding filter: %s",
  [ERROR.Binding_NotABinding]: "[Binding] Not a binding: %s",
  [ERROR.Binding_NotFound]: "[Binding] Binding not found for: %s",
  [ERROR.Binding_ParentNotFound]: "[Binding] Bound parent binding not found for: %s",
  [ERROR.Binding_NoComponent]: "[Binding] Component not bound",
  [ERROR.Binding_ObjectType]: "[Binding] Cannot convert bound object value to string",
  [ERROR.Component_NotAHandler]: "[Component] Not an event handler method: %s",
  [ERROR.Component_InvalidEventHandler]: "[Component] Invalid event handler preset: %s",
  [ERROR.List_Symbol]: "[List] Symbol not supported",
  [ERROR.List_Type]: "[List] Existing objects are not of given type",
  [ERROR.List_Destroyed]: "[List] Cannot add objects to a destroyed list",
  [ERROR.List_Duplicate]: "[List] Cannot insert object that is already in this list",
  [ERROR.List_NotFound]: "[List] Object not found",
  [ERROR.List_OutOfBounds]: "[List] Index out of bounds: %s",
  [ERROR.Map_Type]: "[Map] Existing objects are not of given type",
  [ERROR.Map_Destroyed]: "[Map] Cannot add objects to a destroyed map",
  [ERROR.Object_Base]: "[Object] Cannot add event handler to base class",
  [ERROR.Object_NotEvent]: "[Object] Argument is not a managed event",
  [ERROR.Object_Recursion]: "[Object] Event recursion limit reached",
  [ERROR.Object_CannotDeactivate]: "[Object] Cannot deactivate managed object",
  [ERROR.Object_Destroyed]: "[Object] Managed object is already destroyed",
  [ERROR.Object_StateCancelled]: "[Object] State transition cancelled",
  [ERROR.Object_InvalidRef]: "[Object] Invalid object reference",
  [ERROR.Object_RefDestroyed]: "[Object] Referenced object has been destroyed",
  [ERROR.Object_PropNotManaged]:
    "[Object] Can only create managed properties on managed object instances",
  [ERROR.Object_PropGetSet]:
    "[Object] Cannot turn properties with getters and/or setters into managed references",
  [ERROR.Object_NotWritable]: "[Object] Property is not writable",
  [ERROR.Object_InvalidDep]: "[Object] Dependency must point to a managed object: %s",
  [ERROR.Record_Validation]: "[Record] Validation failed",
  [ERROR.Record_Destroyed]: "[Record] Record has been destroyed",
  [ERROR.Ref_Type]: "[Object] Existing reference is not of given type",
  [ERROR.Service_NoName]: "[Service] Missing property name",
  [ERROR.Service_BlankName]: "[Service] Service name cannot be blank",
  [ERROR.Observe_ObservedType]: "[Object] Observed target is not a managed object class",
  [ERROR.Observe_ObserveParent]: "[Object] Cannot observe events on parent reference",
  [ERROR.Observe_ShadowGetter]:
    "[Object] Shadow observable can only be added to properties with getters",
  [ERROR.Observe_RateLimitNonAsync]:
    "[Object] Rate limit can only be applied to async handlers",
  [ERROR.Observe_ObserverRecursion]: "[Object] Recursion in observer constructor detected",
  [ERROR.Util_NoSync]: "[Object] Synchronous observers are not allowed for property: %s",
  [ERROR.Util_AlreadyManaged]: "[Object] Property is already managed in a base class: %s",
  [ERROR.UIStyle_Invalid]: "[Style] Invalid style set instance",
  [ERROR.UIMenu_NoBuilder]: "[Menu] Builder not found",
  [ERROR.UIModalController_Binding]: "[Modal] modal property cannot be bound",
};